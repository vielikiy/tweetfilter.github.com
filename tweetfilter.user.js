// ==UserScript==
// @name             Tweetfilter
// @version          3.0.0
// @namespace        Chilla42o
// @description      Tweetfilter is a highly customizable timeline filter and feature extension for twitter.com
// @homepageURL      http://tweetfilter.org
// @updateURL        https://userscripts.org/scripts/source/49905.meta.js
// @supportURL       http://github.com/Tweetfilter/tweetfilter.github.com/issues 
// @contributionURL  https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=LKM9ZBZ77KSYN
// @icon             http://tweetfilter.org/icon32.png
// @icon64           http://tweetfilter.org/icon64.png
// @domain           twitter.com 
// @include          http://twitter.com/
// @include          https://twitter.com/
// @include          http://twitter.com/#*
// @include          https://twitter.com/#*
// @match            http://twitter.com/
// @match            https://twitter.com/
// @match            http://twitter.com/#*
// @match            https://twitter.com/#*
// @include          /^https?://twitter\.com/(\?.*)?(#.*)?$/
// @noframes         1
// ==/UserScript==

// Copyright (c) 2009-2011 Chilla42o <tweetfilterjs@gmail.com>
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program. If not, see <http://www.gnu.org/licenses/>.

var TweetfilterScript = function() {


  
  var _initretries = 21;

                                                                                                    _D.i('Loading Tweetfilter!');
  (function LoadTweetfilter() {
    if (typeof twttr !== 'object' || typeof jQuery !== 'function' || !twttr.currentUser) {
                                                                                                    _D.w('twttr / jQuery not loaded yet! retrying another ', _initretries, 'times.')
      if (--_initretries > 0) 
        window.setTimeout(LoadTweetfilter, 210);
    } else {
      if (!twttr.loggedIn) {
                                                                                                    _D.w('not logged in!')
        return;
      }
                                                                                                    _D.l('twttr is loaded!');

      // ############### TweePlus: handling long tweets - see http://tweeplus.com (by Leah Verou) ################

      twttr.klass('Tweetfilter.TweePlus').methods({
        unique: function(arr) {
          var uarr = [];
          for (var a=0,al=arr.length,av;a<al && (av=arr[a]);a++) {
            if (!~uarr.indexOf(av)) uarr.push(av);
          }
          return uarr;
        },
        remove: function(arr,rarr) {
          for (var r=0,rl=rarr.length,rv,p;r<rl && (rv=rarr[r]);r++) {
            while ((p = -~arr.indexOf(rv))) {
              arr.splice(p-1,1);
            }
          }
          return arr;
        },
        encodetext: function(text) {
          return encodeURIComponent(text).replace(/(['\(\)\*\.~]|%20)/g, function($1,$2) { 
            return {"'":'%27','(':'%28',')':'%29','*':'%2A','.':'%2e','~':'%7e','%20':'+'}[$2]; 
          });
        },
        encode: function(text, replytourl) {
          text = $.trim(text);
          var username = replytourl ? (replytourl.match(/\/(\w+)\/status\//i) || [,''])[1] : '',
            cutoff = 115 - (username? username.length + 2 : 0), // initial cut-off point
            summary,
            mentions = this.mentions(text),
            previousLength = mentions.length + 1;
          while(mentions.length < previousLength) {
            summary = text.slice(0, cutoff - (mentions.length? mentions.join(' ').length + 1 : 0));
            previousLength = mentions.length;
            mentions = this.remove(mentions, this.mentions(summary));
          }
          return summary + '[\u2026] ' + 'http://tweeplus.com/'+(replytourl ? '?in_reply_to=' + encodeURIComponent(replytourl) : '')+
                           '#'+this.encodetext(text) + (mentions? ' ' + mentions.join(' ') : '');
        },
        mentions: function(text) {
          return this.unique(text.match(/@\w{1,20}/g) || []);
        }
      });
      
      // 
      // ############### Storage: handling all local / session storage and packing stuff ################
      // 
      // twtfltr.options          <- tweetfilter options
      // twtfltr.filters          <- global filters
      // twtfltr.friends.0
      // twtfltr.friends.cursor
      //
      
      twttr.klass('Tweetfilter.Storage', function(main) {
        
        this.pilot = main.pilot;
        
      })
      .methods({
        
        
        
        //get json value from local storage with default
        getvalue: function(name, defaultvalue, decodejson) {
          if (typeof decodejson === 'undefined') decodejson = true;
          var value = localStorage.getItem(name);
          try {
            return typeof value === 'string' && value.length ? (decodejson ? JSON.parse(value) : value) : defaultvalue;
          } catch (e) {
            return defaultvalue;
          }
        },
        //set json value in local storage
        setvalue: function(name, value) {
          if (value === null) {
            localStorage.removeItem(name);
            return null;
          } else {
            if (typeof value === 'object') {
              value = JSON.stringify(value);
            }
            localStorage.setItem(name, value);
            return this.getvalue(name);
          }
          return false;
        },
        //methods for large positive number compression
        _basemap: function(basestr) {
          var basemap = {};
          for (var i=0,imax=basestr.length; i<imax; i++) {
            basemap[basestr.charAt(i)] = i;
          }
          basemap.length = basestr.length;
          basemap._s = basestr;
          return basemap;
        },
        //compress large number 
        encodenum: function(numstr) {
          var x=0, digit, res = '', remaining;
          for (var i=0,imax=numstr.length; i<imax; i++) {
            digit = numstr.charAt(i)
            x = x * this.base10.length + this.base10[digit];
          }
          while (x > 0) {
            remaining = x % this.basex.length;
            res = this.basex._s.charAt(remaining) + res;
            x = parseInt(x/this.basex.length);
          }
          return res;
        },
        //unpack compressed number
        decodenum: function(numstr) {
          var x=0, digit, res = '', remaining;
          for (var i=0,imax=numstr.length; i<imax; i++) {
            digit = numstr.charAt(i)
            x = x * this.basex.length + this.basex[digit];
          }
          while (x > 0) {
            remaining = x % this.base10.length;
            res = this.base10._s.charAt(remaining) + res;
            x = parseInt(x/this.base10.length);
          }
          return res;    
        },
        //lzw decompress a string
        encodelzw: function(uncompressed) {
           // Build the dictionary.
           var i, dictionary = {}, c, wc, w = "", result = [], dictSize = 256;
           for (i = 0; i < 256; i += 1) dictionary[String.fromCharCode(i)] = i;
           for (i = 0; i < uncompressed.length; i += 1) {
             c = uncompressed.charAt(i);
             wc = w + c;
             if (dictionary[wc]) {
               w = wc;
             } else {
               result.push(String.fromCharCode(dictionary[w]));
               // Add wc to the dictionary.
               dictionary[wc] = dictSize++;
               w = String(c);
             }
           }
           // Output the code for w.
           if (w !== "") {
             result.push(String.fromCharCode(dictionary[w]));
           }
           return result.join('');
         },
        //lzw compress a string
        decodelzw: function (compressed) {
          // Build the dictionary.
          var i, dictionary = [], w, result, k, entry = "", dictSize = 256;
          for (i = 0; i < 256; i += 1) dictionary[i] = String.fromCharCode(i);
          w = compressed[0];
          result = w;
          for (i = 1; i < compressed.length; i += 1) {
            k = compressed[i].charCodeAt(0);
            if (dictionary[k]) {
              entry = dictionary[k];
            } else {
              if (k === dictSize) {
                entry = w + w.charAt(0);
              } else {
                return null;
              }
            }
            result += entry;
            // Add w+entry[0] to the dictionary.
            dictionary[dictSize++] = w + entry.charAt(0);
            w = entry;
          }
          return result;
        },
        //pack object into lzw compressed json string
        pack: function(data) {
          if (typeof data !== 'object') {
                                                                                                    _D.w('invalid data', data);
            return false;
          }
          data = JSON.stringify(data);
                                                                                                    _D.d('packing', data.length, 'bytes');
          return this.encodelzw(data);
        },
        //unpack object from lzw compressed json string
        unpack: function(packed) {
          try {
                                                                                                    _D.d('unpacking', packed.length, 'bytes');
            return JSON.parse(this.decodelzw(packed));
          } catch (e) {
                                                                                                    _D.w('error unpacking', e);
          }
          return false;
        } 
        
      });
      
      twttr.klass('Tweetfilter.Stream', function(pilot) {
        this._pilot = pilot;
      })
      .methods(twttr.EventProvider)
      .methods({
         title: function() {
           switch(this._pilot._stream.namespace) {
             case 'Home':return 'Home timeline';break;
             case 'Mentions':return 'Mentions';break;
             case 'ActivityByNetworkStream':return 'Your friends\' Activity';break;
             case 'Search':
               switch (this._pilot._stream.params.mode) {
                 case 'relevance':return 'Search <em>top Tweets</em>';break;
                 case 'tweets':return 'Search <em>all Tweets</em>';break;
                 case 'links':return 'Search <em>Tweets with links</em>';break;
               }
               break;
             case 'List':return this.whose()+'List <b>'+this._pilot._stream.params.listSlug+'</b>';break;
             case 'OwnLists':return this.whose()+'Lists';break;
             case 'User':return this.whose()+'Tweets';break;
             case 'Favorites':return this.whose()+'Favorites';break;
             case 'Following':return 'Following';break;
             case 'Friends':return this.whose()+'Friends';break;
             case 'FollowingTweets':return this.whose()+'Timeline';break;
             case 'Followers':return this.whose()+'Followers';break;
             case 'SocialContextStream':return 'Your and '+this.whose()+'Friends';break; //you both follow
             case 'ListMembers':return 'Members of list <b>'+this._pilot._stream.params.listSlug+'</b>';break;
             case 'ListFollowers':return 'Followers of list <b>'+this._pilot._stream.params.listSlug+'</b>';break;
             case 'UserRecommendationsStream':return 'Who to follow: Suggestions';break;
             case 'SuggestionCategoryMembersStream':
             case 'SuggestionCategoriesStream':
               return 'Who to follow: Interests'; 
             break;
             case 'ContactImportServices':return 'Who to follow: Import contacts';break;
           }
           return 'unknkown: '+this._pilot._stream.namespace;        
         },
         isusers: function() {
           return this._pilot._stream.itemtype === 'user'; 
         },
         istweets: function() {
           return this._pilot._stream.itemtype === 'tweet'; 
         },
         isactivity: function() {
           return this._pilot._stream.itemtype === 'activity'; 
         },
         islinks: function() {
           return this._pilot._stream.params.mode && this._pilot._stream.params.mode === 'links';
         },
         isretweets: function() { //is current stream showing only retweets
           return this._pilot._stream.namespace.indexOf('RetweetsBy') === 0;
         },
         ismentions: function() {
           return this._pilot._stream.namespace === 'Mentions';
         },
         ismytweets: function() {
           return this._pilot._stream.namespace === 'YourTweetsRetweeted' || (this._pilot._stream.namespace === 'User' && this._pilot._stream.params.screenName.toLowerCase() === this.user.name);        
         },  
         isfiltered: function() {
           return this.stream.isready() && this.cs.hasOwnProperty('filter');
         },
         whose: function() {
           return !this._pilot._stream.params.hasOwnProperty('screenName') || 
                   this._pilot._stream.params.screenName.toLowerCase() === this.user.name ? 
                   'Your ' : '@'+this._pilot._stream.params.screenName+"'s ";        
         },
         isprotected: function() {
           return this._pilot._stream.params.hasOwnProperty('canViewUser') && this._pilot._stream.params.canViewUser === false;
         },
         isready: function() {
           return (this._pilot._stream.key === 'unknown') || (!this._isloading && this.cs && this._pilot._stream.key === this.cs._cacheKey);
         },
         setloading: function() {
           if (this.stream.status !== 'loading') {
            this.stream.status = 'loading';
           }
         },
         isloading: function() {
           return this._pilot._stream.status === 'loading';
         },
         identify: function(streamid) {
           if (streamid.indexOf('{') === -1) {
             return streamid === this._pilot._stream.namespace;
           } else {
             var streamns = streamid.substr(0, streamid.indexOf('{'));
             if (streamns === this._pilot._stream.namespace) {
               var streamparams = JSON.parse(streamid.substr(streamid.indexOf('{')));
               for (var p in streamparams) {
                 if (!this._pilot._stream.params.hasOwnProperty(p) || this._pilot._stream.params[p] !== streamparams[p]) {
                   return false;
                 }
               }
               return true;
             }
             return false;
           }
         },
         itemclass: function() {
           return this._pilot._stream.streamItemClass || 'stream-item';
         },
         streamid: function() {
           var streamparams = {};
           for (var p in this._pilot._stream.params) {
              if (~['listSlug','screenName','query'].indexOf(p)) {
               streamparams[p] = this._pilot._stream.params[p];
             }
           }
           for (p in streamparams) {
             return this._pilot._stream.namespace+JSON.stringify(streamparams);
           }
           return this._pilot._stream.namespace;
         }      
       });
      
      //do all the filter related stuff
      twttr.klass('Tweetfilter.Filter', function() {
        
      }).methods({
        parseitems: function() {
          
        },
        parsestream: function() {
          
        },
        getlocaldate: function(utcstr, utcoffset, timezone) {
          var result = {time: '', timezone: ''};
          var yourtime = utcstr ? new Date(twttr.helpers.parseDateString(utcstr)) : new Date(); //createdAt is undefined in tweets written "just now"
          if (typeof utcoffset === 'number') {
            var userdiff = (utcoffset - twttr.currentUser.utcOffset)*1000,
                usertime = new Date(yourtime.getTime() + userdiff), 
                usergmt = (utcoffset > 0 ? '+' : '')+(utcoffset / 60 / 60)+' ('+(userdiff > 0 ? '+':'')+(userdiff/60/60/1000)+'h)',
                time24 = function(datetime) {
                   var h=datetime.getHours(), m=datetime.getMinutes();
                   return (h<10 ? '0'+h : h)+':'+(m<10 ? '0'+m : m);
                };
            result.time = time24(usertime),
            result.timezone = this.encodehtml(timezone)+' GMT '+usergmt;
          }
          result.timestamp = yourtime.toLocaleTimeString()+' '+yourtime.toLocaleDateString();
          result.prettytimestamp = twttr.helpers.prettyTime(yourtime);
          return result;
        }        
      }); 
      
      //all css creation and manipulation
      twttr.klass('Tweetfilter.Styler', function(main) {
                                                                                                    _D.d('constructor arguments:', arguments);
        this.main = main;                                                                                           
        $('head').append( //create style containers
          '<style id="tf-widget" type="text/css"></style>',  //contains main widget layout
          '<style id="tf-options" type="text/css"></style>', //contains options css
          '<style id="tf-friends" type="text/css"></style>', //display friend status, updated separately
          '<style id="tf-filter" type="text/css"></style>'   //hide and show single tweets according to filters
        );
        this.refreshoptions();
      }).methods({
        //get vendor prefix for css property. 
        //adapted from https://gist.github.com/523692 (by Paul Irish)
        _prefixed: function(prop) {
          var prefixes = ['Moz','Khtml','Webkit','O','ms'],
              elem = document.createElement('div'),
              upper = prop.charAt(0).toUpperCase() + prop.slice(1);
          if (prop in elem.style)
            return prop;
          for (var len = prefixes.length; len--; ){
            if ((prefixes[len] + upper) in elem.style)
              return ('-' + prefixes[len].toLowerCase() + '-' + prop);
          }
          return false;
        },
        //set style element contents
        _setcss: function(id, styles) {
                                                                                                    _D.l(id);
          
          $('style#tf-'+id).html(styles.replace(/@([a-z]+)/g, twttr.bind(this, function(a, style) {
                                                                                                    _D.l(style, arguments);
            return this._prefixed(style);
          })));
        },
        refreshoptions: function() {
                                                                                                    _D.l('refreshing options css');
          var styles = '', option, optiontype, enabled, optioncss;
          for (var o in this.main.options) {
            option = this.main.options[o];
            if ('css' in option) {
              enabled = this.main.getoption(o, false);  //get option value respecting "setto". if setto was deleted in main
              if (option.css && (optioncss = option.css[enabled ? 'active' : 'inactive'])) {
                optiontype = typeof(optioncss);
                styles += (optiontype === 'string' ? optioncss+"\n" :
                          (optiontype === 'object' ? optioncss.join("\n")+"\n" : 
                          (optiontype === 'function' ? twttr.bind(this.main, optioncss)() : '')));
              } 
              if (option.hasOwnProperty('setto')) {
                option.current = option.setto;
                delete option.setto;
              }
            }
          }          
                                                                                                    _D.d(styles);
          this._setcss('options', styles);
        },
        //css3 linear gradient
        gradient: function(startcolor, endcolor, vertical) {
          vertical = typeof vertical === 'undefined' ? 0 : +vertical;  
          var css = ['background-color: '+startcolor]; //fallback to solid fill
          var start = vertical ? 'top' : 'left'; 
          if ($.browser.mozilla) {
            css = css.concat([
              'background-image: -moz-linear-gradient('+start+', '+startcolor+', '+endcolor+')' /* FF3.6 */
            ]);
          } else if ($.browser.webkit) {
            css = css.concat([
              'background-image: -webkit-gradient(linear, left top, '+(vertical ? 'left bottom' : 'right top')+', from('+startcolor+'), to('+endcolor+'))', /* Saf4+, Chrome */
              'background-image: -webkit-linear-gradient('+start+', '+startcolor+', '+endcolor+')' /* Chrome 10+, Saf5.1+ */
            ]);      
          } else if ($.browser.msie) { 
            css = css.concat([
             'background-image: -ms-linear-gradient('+start+', '+startcolor+', '+endcolor+')' /* IE10 */
            ]);      
          } 
          css = css.concat([ //always include the w3c method
           'background-image: linear-gradient('+start+', '+startcolor+', '+endcolor+')' /* W3C */
          ]);
          return css.join(';')+';'; 
        },
        //css3 striped background
        stripes: function(basecolor) {
          if (!Modernizr.cssgradients) {
            return 'background-color: '+basecolor+';';
          }
          var css = ['background-color: '+basecolor+';',
            '-webkit-background-size: 20px 20px;',
            '-moz-background-size: 20px 20px;',
            'background-size: 20px 20px;' 
          ]; //fallback to solid fill
          if ($.browser.mozilla) {
            css = css.concat(['background-image: -moz-linear-gradient(-45deg, rgba(255, 255, 255, .2) 25%, transparent 25%,',
              'transparent 50%, rgba(255, 255, 255, .2) 50%, rgba(255, 255, 255, .2) 75%,',
              'transparent 75%, transparent);'
            ]);
          } else if ($.browser.webkit) {
            css = css.concat(['background-image: -webkit-gradient(linear, 0 0, 100% 100%,',
              'color-stop(.25, rgba(255, 255, 255, .2)), color-stop(.25, transparent),',
              'color-stop(.5, transparent), color-stop(.5, rgba(255, 255, 255, .2)),',
              'color-stop(.75, rgba(255, 255, 255, .2)), color-stop(.75, transparent),',
              'to(transparent));'
            ]);
            css = css.concat(['background-image: -webkit-linear-gradient(-45deg, rgba(255, 255, 255, .2) 25%, transparent 25%,',
              'transparent 50%, rgba(255, 255, 255, .2) 50%, rgba(255, 255, 255, .2) 75%,',
              'transparent 75%, transparent);'
            ]);
          } else if ($.browser.msie) { 
            css = css.concat(['background-image: -ms-linear-gradient(-45deg, rgba(255, 255, 255, .2) 25%, transparent 25%,',
              'transparent 50%, rgba(255, 255, 255, .2) 50%, rgba(255, 255, 255, .2) 75%,',
              'transparent 75%, transparent);'
            ]);
          } else if ($.browser.opera) {
            css = css.concat(['background-image: -o-linear-gradient(-45deg, rgba(255, 255, 255, .2) 25%, transparent 25%,',
              'transparent 50%, rgba(255, 255, 255, .2) 50%, rgba(255, 255, 255, .2) 75%,',
              'transparent 75%, transparent);'
            ]);
          }
          //always include the w3c method
          css = css.concat(['background-image: linear-gradient(-45deg, rgba(255, 255, 255, .2) 25%, transparent 25%,',
            'transparent 50%, rgba(255, 255, 255, .2) 50%, rgba(255, 255, 255, .2) 75%,',
            'transparent 75%, transparent);'
          ]);
          return css.join("\n"); 
        },

        //css3 box-shadow
        shadow: function(blur, color, hoffset, voffset) {
          if (!Modernizr.boxshadow) {  
            return 'border:1px solid '+color+'; ';
          }
          if (typeof hoffset !== 'string') hoffset = '0';
          if (typeof voffset !== 'string') voffset = '0';
          var offset = blur !== 'none' ? hoffset+' '+voffset+' ' : '';
          var css = [];
          
          if ($.browser.webkit) {
            css.push('-webkit-box-shadow: '+offset+blur+' '+color);
          } else if ($.browser.mozilla) {
            css.push('-moz-box-shadow: '+offset+blur+' '+color);
          }
          css.push('box-shadow: '+offset+blur+' '+color);
          return css.join(';')+';'; 
        },
        //css3 border-radius
        rounded: function(radius) {
          if (!Modernizr.borderradius) {
            return '';
          }
          var css = [];
          
          if ($.browser.mozilla) {
            css = css.concat([ 
              '-moz-border-radius: '+radius
            ]);
          } else if ($.browser.webkit) {
            css = css.concat([ 
              '-webkit-border-radius: '+radius,
              '-webkit-background-clip: padding-box'
            ]);
          }
          css = css.concat([  //always include the w3c method
            'border-radius: '+radius,
            'background-clip: padding-box'
          ]);
          return css.join(';')+';'; 
        }
      });
      
      
      // ############### pilot: watching changes, emitting messages, provide access to dom and twttr objects ################

      twttr.klass('Tweetfilter.Pilot', function() {
                                                                                                    _D.d('constructor arguments:', arguments);
        this._pages = this.constructor._remap('_pages');
        this._streams = this.constructor._remap('_streams');
        this._routes = this.constructor._routes;
        this._heartbeat = 420; //default timer interval
        this._route = false; //current route
        this._page = false; //current page name
        this._pageswitched = false; //to trigger pageswitched event only once
        this._isloading = false; //to trigger loading event only once
        this._stream = {
          key: null,
          itemtype: null,
          namespace: null,
          params: null
        };   //current stream info
        this._timer = {
          waitforstream: -1 //waiting for stream to be switched
        };
        this.options = {
          clearstreamcache: false
        };
        var currentuser = twttr.currentUser;
                                                                                                    _D.l('twttr user:', currentuser);
        this.user = {
          id: currentuser.idStr,
          atname: currentuser.screenName.toLowerCase(),
          atName: currentuser.screenName,
          bioname: currentuser.name.toLowerCase(),
          bioName: currentuser.name,
          picture: currentuser.profileImageUrl,
          colors: {
            background: currentuser.profileBackgroundColor,
            links: currentuser.profileLinkColor,
            text: currentuser.profileTextColor,
            border: currentuser.profileSidebarBorderColor
          }
        };
                                                                                                    _D.l('pilot user:', this.user);
                                                                                                    _D.d('route name => page name:', this._pages);
                                                                                                    _D.d('stream namespace => stream itemtype:', this._streams);
      })
      .methods(twttr.EventProvider)
      .methods({
        initialize: function() {
                                                                                                    _D.w('initialize pilot!');
          twttr.provide('twtfltr.stream', new Tweetfilter.Stream(this)); 
          this._bindevents();
        },
        _twttrajaxevent: function(event, request, settings) {
          if (settings.url.indexOf('urls/resolve') > -1) { //resolved urls or opened tweet details pane for first time
                                                                                                    _D.d('resolved urls', request, settings);
            if (request.status === 200 && settings.dataType === 'json') {
              try {
                var response = JSON.parse(request.responseText);
                this.trigger('urlsresolved', {urls: response});
              } catch(e) {
                                                                                                    _D.w(e);
              }
            }
          } else if (settings.url.indexOf('/activity/') > -1 || settings.url.indexOf('/trends/') > -1 || 
                     settings.url.indexOf('/recommendations') || settings.url.indexOf('/promos/')) 
          { //fetched trends, who to follow, activity, ad
            this.trigger('ajax_event', {url: settings.url});
          } 
        },
        _twttreventhandler: function(e,a,b) {
                                                                                                    _D.i('triggered event:', e.type, ' with params: ', a,',', b);
          switch(e.type) {
            //this event is triggered in twttr.router, when a new location has been set (hash changed). we are only interested in pages we know (this.routemap)
            case 'routeFollowed': //a = route
                                                                                                    _D.w('------------routeFollowed-------------------------');
              if (!this._routes[a.name]) {  //get stream for route
                                                                                                    _D.w('unknown route:', a.name);
                this.clearstreamcache();
                this._route = this._stream.key = this._stream.namespace = this._stream.itemtype = 'unknown'; 
                this._stream.params = {};
                this.trigger('routeunknown', {route: a});
                return;
              }
              this._stream.namespace = this._routes[a.name];
              if (!this._stream.namespace) {
                this.trigger('streamunknown');
                return;
              }
                                                                                                    _D.l('expected stream namespace:', this._stream.namespace);
              this._stream.params = {};
              var _route = '', streamparam, hasargs = false;
              for (var p in a.args) {
                streamparam = p.replace(/_([a-z])/, function(m,c) {return c.toUpperCase();});
                this._stream.params[streamparam] = a.args[p]; 
                hasargs = true;
              }
              _route = hasargs ? a.name+JSON.stringify(this._stream.params) : a.name;
                                                                                                    _D.l('routeFollowed:', _route);
              if (_route !== this._route) { //check if route changed. since this is the routefollowed event and not "routed", this should always be true
                this._route = _route;
                this.trigger('routeswitched', {route: _route});
              } else {
                                                                                                    _D.w('route NOT changed');
                return;
              }
              if (this._pages[a.name]) { //check if the page for this route is known
                this._pageswitched = false; //used to trigger pageswitched only once
                this._page = this._pages[a.name];
                if (this._timer.waitforstream && this._timer.waitforstream > -1) {
                  window.clearTimeout([this._timer.waitforstream, this._timer.waitforstream=-1][0]);
                }
                this._waitforstream();
                this.trigger('waitforstream', this._stream);
              } else { // unknown route for page
                this._page = false;
                this.trigger('pageunknown', {route:a});
              }
            break;
            case 'reloadCurrentStream':
                                                                                                    _D.w('------------reloadCurrentStream-------------------------');
            case 'switchingToStream': //for stream changes that don't change the route, like switch from "All" to "Top" in saved search.
              //we are only concerned about changing "mode" param while namespace remains the same, we assume the stream namespace itself is correctly switched in routefollowed
                                                                                                    _D.w('------------switchingToStream-------------------------');
                                                                                                    _D.l('about to switch to stream:', decodeURIComponent(a._cacheKey), this._stream.namespace, this._stream.params, a.params);
             if (a.params.mode) { //only if mode is set
               var streamkey = decodeURIComponent(a._cacheKey);
               var namespace = streamkey.substr(0, streamkey.indexOf('{'));
               var params = JSON.parse(streamkey.substr(streamkey.indexOf('{')));
                                                                                                    _D.l('parsed stream key, namespace:', namespace, ', params:', params);
               if (namespace === this._stream.namespace) {
                 var route = {
                   name: twttr.router.getCurrentRoute().name,
                   args: params
                 };
                                                                                                    _D.w('found a stream switch with same route and different mode:', a.params.mode,'!=',this._stream.params.mode, ' - faking new route:', route);
                 //fake a routefollowed event
                 this._twttreventhandler({type:'routeFollowed'}, route);
               } else {
                                                                                                    _D.w('namespaces do not match:', namespace, '!=', this._stream.namespace);
               }
             }
            break;
            case 'didTweet':
              this.trigger('newitemsloaded', {count: 1});
            break;
            case 'newItemsCountChanged': //a = count of new items
              this.trigger('newitemsloaded', {count: a});
            break;
            case 'doneLoadingMore':
              this.trigger('moreitemsloaded');
            break;
          }
        },
        _bindevents: function() {
          try {
                                                                                                    _D.l('trying to link objects');
            if (!twttr.app._tfbound) {
                                                                                                    _D.l('binding app events');
              twttr.app.bind('switchToPage', twttr.bind(this, this._twttreventhandler));
              twttr.app._tfbound = true;
            }
            if (!twttr.router._tfbound) {
                                                                                                    _D.l('binding router events');
              twttr.router.bind('routeFollowed', twttr.bind(this, this._twttreventhandler));
              twttr.router._tfbound = true;
            }
            $(document).bind('ajaxSuccess', twttr.bind(this, function(event, request, settings) { 
              this._twttrajaxevent(event, request, settings); 
            })); //watch for ajax requests
            this._twttreventhandler({type:'routeFollowed'}, twttr.router.getCurrentRoute()); //fire up first time      
            return true;
          } catch(e) {
                                                                                                    _D.w(e);
            return false;
          }   
        },        
        _waitforstream: function() {
            try {
                                                                                                    _D.l('waiting for page', this._page, 'with stream', JSON.stringify(this._stream));
              if (twttr.app.currentPage && twttr.app.currentPage()._instance) {
                this.cs = this.sm = this.cp = null;
                var cp = twttr.app.currentPage();
                this.cp = cp._instance;
                if (this.cp.pageNameUnderscore !== this._page) { //these must match, expected page and current page, else we have not switched
                                                                                                    _D.w('current page', this.cp.pageNameUnderscore, 'is not expected', this._page);
                  throw 'pagenotswitched';
                }
                if (this.cp.streamManager && this.cp.streamManager.getCurrent) {
                                                                                                    _D.l('current page found. switched:', this._pageswitched);
                  if (!this._pageswitched) { //trigger pageswitched only after the streamManager for page is loaded
                    this.trigger('pageswitched', {page: this._page});
                    this._pageswitched = true;
                  }
                  this.sm = this.cp.streamManager;
                  if (!this.sm._tfbound) {
                                                                                                    _D.l('binding stream manager events');
                    this.sm.bind('newItemsCountChanged switchingToStream', twttr.bind(this, this._twttreventhandler));
                    this.sm._tfbound = true;
                  }
                  if ((this.cs = this.sm.getCurrent())) {
                    if (this._stream.key !== this.cs._cacheKey) { //has stream switched
                      this._isprotected = this.cs.params.hasOwnProperty('canViewUser') ? !this.cs.params.canViewUser : false; 
                      if ((this.cs.items && this.cs.items.length && $("div.stream-item", this.sm.$streamContainer).length) || (this._isprotected || this.cs.$find('.no-members,.stream-end').length)) {
                        //check if it's the expected stream
                        var namespace = decodeURIComponent(this.cs._cacheKey);
                        if (namespace.indexOf('{')>-1) namespace = namespace.substr(0,namespace.indexOf('{'));
                                                                                                    _D.l('found stream namespace', namespace, 'in', this.cs._cacheKey);
                        if (namespace !== this._stream.namespace) {
                                                                                                    _D.w('stream namespace ', namespace, 'does not match expected',this._stream.namespace);
                          throw 'streamnamespacenotswitched';
                        }                                                                                      
                                                                                                    _D.l('checking stream params ', JSON.stringify(this.cs.params), '<<>>', JSON.stringify(this._stream.params));
                        for (var p in this._stream.params) {
                          if (this.cs.params.hasOwnProperty(p)) {
                            if ((typeof this.cs.params[p] === 'string' && this.cs.params[p].toLowerCase() !== this._stream.params[p].toLowerCase()) || 
                               (typeof this.cs.params[p] !== 'string' && this.cs.params[p] != this._stream.params[p])) {
                                                                                                    _D.w('stream param ', p, 'does not match:', this.cs.params[p], '!=', this._stream.params[p]);
                              throw 'streamparamsnotswitched';
                            }
                          }
                        }
                        //special fix for mode parameter which is not set in route parameters but is set in cachekey for the stream (decider switches first mode to default "Top")
                        if (this.cs.params.mode && !this._stream.params.mode) {
                          this._stream.params.mode = this.cs.params.mode;
                        }
                        if (!this.cs._tfbound) { //in uncached streams, the property will be deleted after page switch
                          this.cs.bind('didTweet doneLoadingMore streamEnd reloadCurrentStream', twttr.bind(this, this._twttreventhandler));
                          this.cs._tfbound = true;
                        }
                        this.clearstreamcache();
                        this._stream.key = this.cs._cacheKey;
                        this._stream.itemtype = this.cs.streamItemType;
                        this._isloading = false;
                        var streamusername = this.cs.screenName, 
                            profileuser = twttr.profileUser;
                        if (!!streamusername && !!profileuser) {
                          streamusername = streamusername.toLowerCase();
                          var profileusername= profileuser.screenName.toLowerCase();
                                                                                                    _D.l('stream user:', streamusername, 'profile user:', profileusername, 'current user:', this.user.atname);
                          if (streamusername !== this.user.atname && profileusername === streamusername) {
                            this.profileuser = {
                              atname: profileuser.screenName.toLowerCase(),
                              atName: profileuser.screenName,
                              bioname: profileuser.name.toLowerCase(),
                              bioName: profileuser.name,
                              picture: profileuser.profileImageUrl,
                              colors: {
                                background: profileuser.profileBackgroundColor,
                                links: profileuser.profileLinkColor,
                                text: profileuser.profileTextColor,
                                border: profileuser.profileSidebarBorderColor
                              }
                            }
                          } else delete this.profileuser;
                        } else delete this.profileuser;
                        this.trigger('streamswitched');
                                                                                                    _D.i('stream successfully switched', this._stream);
                        return true;
                      } else {
                                                                                                    _D.w('items are not loaded yet');
                        throw 'itemsnotloaded';
                      }
                    } else {
                      throw 'streamkeynotswitched';
                    }
                    //stream was not switched, should'nt get here
                                                                                                    _D.w('is NOT switched');
                  } else {
                                                                                                    _D.w('stream component is not loaded');
                    throw 'streamnotloaded';
                  }
                } else {
                                                                                                    _D.w('stream manager component is not loaded');
                  //required component
                  throw 'streammanagernotloaded';
                }
              } else {
                                                                                                    _D.w('page component is not loaded');
                //current page is not loaded or not the one we expected. this._page is set earlier in routeFollowed and must match current's page name at this point
                throw 'pagenotloaded';
              }
            } catch(e) {
              if (!this._isloading) {
                this.trigger('loading');
                this._isloading = true;
              }
              if (!this._timer.waitforstream || this._timer.waitforstream === -1) {
                                                                                                    _D.w('repolling waitforstream due to exception:', e);
                this._timer.waitforstream = window.setTimeout(twttr.bind(this, function() {
                  this._timer.waitforstream = -1;
                  this._waitforstream();
                }), this._heartbeat);
              }else {
                                                                                                    _D.w('NOT repolling waitforstream, already queued!', e);
              }
              return false;
            }
          }, 
          clearstreamcache: function() {
            if (this.options.clearstreamcache && this._stream.key && this.sm && this.sm.streams && this.sm.streams[this._stream.key]) {
                                                                                                    _D.i('clearing cache of previous stream:', decodeURIComponent(this._stream.key));
              delete this.sm.streams[this._stream.key];
            }
          }   
      })
      .statics({
        _pages: { //pageNameUnderscore => route.name
          "profile":["subscriptions","similarTo","memberships","userFavorites","followers","following","profile"],
          "home":["home"],
          "connect":["connect","mentions"],
          "discover":["discover","networkActivity","whoToFollowSuggestions","whoToFollowImport","whoToFollowInterests"],
          "search":["searchResults","searchRealtime","userSearch"]
        },
        _streams: { //streamItemType => stream namespace
          "user":["UserSimilaritiesStream","Followers","Friends","UserRecommendationsStream","PeopleSearch"],
          "tweet":["Favorites","User","Home","Mentions","Search"],
          "activity":["ActivityOfMeStream","ActivityByNetworkStream"]
         //only the itemtypes which can be parsed by Tweetfilter.parsestream
        },
        _remap: function(_prop) {
          var result = {};
          for (var a in this[_prop]) {   
            for (var i=0,imax=this[_prop][a].length;i<imax;i++) {
              result[this[_prop][a][i]] = a;
            }
          }
          return result;
        },
        _routes: { //route.name => stream namespace (from stream._cacheKey)
          "subscriptions":"AllSubscriptionsUser",
          "similarTo":"UserSimilaritiesStream",
          "memberships":"MembershipsUser",
          "userFavorites":"Favorites",
          "followers":"Followers",
          "following":"Friends",
          "profile":"User",
          "home":"Home",
          "connect":"ActivityOfMeStream",
          "mentions":"Mentions",
          "discover":"Discover",
          "networkActivity":"ActivityByNetworkStream",
          "whoToFollowSuggestions":"UserRecommendationsStream",
          "whoToFollowImport":"ContactImportServices",
          "whoToFollowInterests":"SuggestionCategoriesStream",
          "searchResults":"Search",
          "searchRealtime":"Search",
          "userSearch":"PeopleSearch"
        }
      });  
      
      //************* Tweetfilter main 
      twttr.klass('Tweetfilter.Main', function() {
                                                                                                    _D.i('creating pilot');
        this.options = this.constructor.options;

        this.loadoptions();
        this.pilot = new Tweetfilter.Pilot(this);
        this.styler = new Tweetfilter.Styler(this);
        this.pilot.bind('newitemsloaded', function() {
          window.setTimeout(twttr.bind(this, function() {
            $('div.js-new-tweets-bar').trigger('click');
            if (this.getoption('expand_lock_scroll')) {
              
            }
          }), 840);
        });
        this.pilot.bind('streamswitched', twttr.bind(this, function() {
          this.refreshoptions();
        }));
        this.pilot.initialize();
      }).statics({
        options: {
          'expand_new_tweets': { //expand new tweets immediately, don't show new tweets bar
            current: false,
            css: {
              active: 'div.new-tweets-bar { display:none !important; }'
            }
          },
          'expand_lock_scroll': {
            current:false
          },
          'flip_sides': { //flip sides of dashboard and timeline
            current: false,
            css: {
              active: ['.content-main { float:left !important; }',
                       '.dashboard { float:right !important; }',
                       '.module .chev-right { @transform:rotate(180deg); right: auto; left: 12px; }',
                       '.module .list-link { padding: 8px 12px 8px 32px; }',
                       '.component[data-component-term="thumbnail_viewer"] { margin-left: -20px; }']
            }
          },
          'hide_wtf': { //hide the "who to follow" box in dashboard
            current: false,
            css: {
              active: '.component[data-component-term="user_recommendations"] { display:none !important; }'
            }
          },
          'hide_trends': { //hide the "trends" box in dashboard
            current: false,
            css: {
              active: '.component[data-component-term="trends"] { display:none !important; }'
            }
          },
          'hide_menu': { //hide the website menu in dashboard
            current: false,
            css: {
              active: '.component[data-component-term="footer"] { display:none !important; }'
            }
          },
          'hide_promoted_content': { //hide promoted tweets in stream
            current: false,
            css: {
              active: ['.stream-item[data-item-type="tweet"][data-item-id*=":"], *[class*="promoted"]  { display:none !important; }']
            }
          },
          'hide_topbar': {
            current: false,
            enable: function() {
              $('.topbar').bind('mouseenter.hide_topbar', function() {
                $(this).toggleClass('mouseover', true);
              }).bind('mouseleave.hide_topbar', function() {
                $(this).removeClass('mouseover');
              });
              $('#search-query').bind('focus.hide_topbar', function() {
                $('.topbar').toggleClass('focused', true);
              }).bind('blur.hide_topbar', function() {
                $('.topbar').removeClass('focused');
              });
            },
            disable: function() {
              $('.topbar,#search-query').unbind('.hide_topbar');
            },
            css: {
              active: [
                '#page-container { padding-top:14px; }',
                '.topbar { top:-30px; opacity:0; @transition: opacity .25s linear, top .25s ease-out; }',
                '.topbar.focused, .topbar.mouseover { top: 0; opacity:1; @transition: opacity .25s linear, top .25s ease-out; }'
              ]
            }
          },
          'connect_mentions': { //map the "connect" menu button to mentions instead of @user-activity
            current: false,
            enable: function() {
              var barlink = $('#global-actions a[data-component-term=connect_nav]'), barhtml;
              if (barlink.length) {
                barhtml = barlink.html();
                barhtml = barhtml.substr(0, barhtml.lastIndexOf('>')+1)+' '+_('Mentions');
                barlink.html(barhtml).attr('href', '/#!/mentions');
                return true;
              }
              return false; //element not found
            },
            disable: function() {
              var barlink = $('#global-actions a[data-component-term=connect_nav]'), barhtml;
              if (barlink.length) {
                barhtml = barlink.html();
                barhtml = barhtml.substr(0, barhtml.lastIndexOf('>')+1)+' '+_('Connect');
                barlink.html(barhtml).attr('href', '/#!/i/connect');
                return true;
              }
              return false; //element not found
            }
          },
          'discover_activities': {  //map the "discover" menu button to public activity instead of #stories
            current: false,
            enable: function() {
              var barlink = $('#global-actions a[data-component-term=discover_nav]'), barhtml;
              if (barlink.length) {
                barhtml = barlink.html();
                barhtml = barhtml.substr(0, barhtml.lastIndexOf('>')+1)+' '+_('Activity');
                barlink.html(barhtml).attr('href', '/#!/activity');
                return true;
              }
              return false; //element not found
            },
            disable: function() {
              var barlink = $('#global-actions a[data-component-term=discover_nav]'), barhtml;
              if (barlink.length) {
                barhtml = barlink.html();
                barhtml = barhtml.substr(0, barhtml.lastIndexOf('>')+1)+' '+_('Discover');
                barlink.html(barhtml).attr('href', '/#!/i/stories');
                return true;
              }
              return false; //element not found
            }
          },
          'fixed_dashboard': {
            current: false,
            enable: function() {
              twttr.$win.bind('resize.fixed_dashboard scroll.fixed_dashboard', twttr.bind(this, this.scrolldashboard));
              this.scrolldashboard();
            },
            disable: function() {
              twttr.$win.unbind('.fixed_dashboard');
            },
            css: {
              active: function() { //n.b.: 'this' is Tweetfilter.Main in option callbacks
                                                                                                    _D.l('flip_sides active:', this.getoption('flip_sides'));
                var styles = [];
                if (this.getoption('flip_sides', false)) {              
                  styles.push('.dashboard { position:fixed; margin-left: 535px; }');
                } else {
                  styles.push('.dashboard { position:fixed; margin-right: 535px; }');
                }
                return styles.join("\n");
              }
            }
          }
        }
      }).methods({
        refreshoptions: function() {
          var option, enabled;
          for (var o in this.options) {
            option = this.options[o];
            if ('setto' in option) {
              if (option.current !== option.setto && typeof option[option.setto ? 'enable' : 'disable'] === 'function') {
                                                                                                    _D.d('set option', o, 'to', option.setto, option, '(is currently', option.current, ')');
                                                                                                    _D.d('callback:', option[option.setto ? 'enable' : 'disable'])
                if (twttr.bind(this, option[option.setto ? 'enable' : 'disable'])() !== false) {
                                                                                                    _D.d('callback was fine.')
                  this.options[o].current = option.setto;
                  delete option.setto;
                } else {
                                                                                                    _D.w('setting option', o, 'to', option.setto, 'failed (callback returned false)');
                }
              }
              
            }
          }          
        },
        getoption: function(option, currentonly) {
          if (typeof currentonly !== 'boolean') {
            currentonly = true;
          }
          if (option in this.options) {
            if (!currentonly && typeof this.options[option].setto === 'boolean') {
              return this.options[option].setto;
            }
            return this.options[option].current;
          }
          return false;
        },
        setoption: function(option, enabled) {
          if (option in this.options) {
            if (this.options[option].current !== enabled) {
              this.options[option].setto = enabled;
              this.refreshoptions();
              if (this.options[option].css) {
                this.styler.refreshoptions();
              }
              return this.options[option].current === enabled;
            }
          }
          return false;
        },
        loadoptions: function() {
          //TODO: load/save with Tweetfilter.Storage
          var saved = { 
            expand_new_tweets: true,
            expand_lock_scroll: true,
            flip_sides: true,
            hide_wtf: true,
            hide_menu: true,
            hide_trends: true,
            hide_promoted_content: true,
            connect_mentions: true,
            fixed_dashboard: true,
            hide_topbar: true,
            discover_activities: true
          };
          for (var o in this.options) {
            if (o in saved) {
                                                                                                    _D.l('load option ', o, ':', saved[o]);
              this.options[o].setto = saved[o];
            }
          }
          this.refreshoptions();
        },
        scrolldashboard: function() {
                                                                                                    _D.d('fixing dashboard position');
          var scroll = this._scroll || {},
              scrolly = twttr.$win.scrollTop(),
              dashboard = twttr.app.currentPage().$find('.dashboard'),
              main = twttr.app.currentPage().$find('.js-content-main'),
              dashboardtop = parseInt(dashboard.css('top')),
              dashboardbottom = parseInt(dashboard.css('bottom'));  
                                                                                                    _D.d('main offset:', main.offset());    
                                                                                                    _D.d('dashboard top:', dashboardtop, ', bottom:', dashboardbottom);    
          if (typeof scroll.y !== 'number') {
            scroll.y = 0;
          }          
          var scrolldelta = scrolly - scroll.y;
                
          if (scrolldelta > 0) { //scrolled down          
                                                                                                    _D.d('scrolled down.');
                                                                                                    _D.d('scrolly:', scrolly, 'scrolldelta:', scrolldelta);
            if (dashboardbottom < 14) {
              if (dashboardbottom + scrolldelta < 14) {
                dashboard.css({'top': dashboardtop - scrolldelta})
              } else {
                dashboard.css({'top':dashboardtop - (14 - dashboardbottom)})
              }
            }
          } else {
                                                                                                    _D.d('scrolled up.');
                                                                                                    _D.d('scrolly:', scrolly, 'scrolldelta:', scrolldelta);
            if (dashboardtop < main.offset().top) {
              if (dashboardtop - scrolldelta < main.offset().top) {
                dashboard.css({'top': dashboardtop - scrolldelta})
              } else {
                dashboard.css({'top':main.position().top})
              }
            }
          }
          scroll.y = scrolly;
                                                                                                    _D.d('scroll status:', scroll);
          this._scroll = scroll;
        }
      });
      
      twttr.provide('twtfltr.templates', {
        
      });
      
      twttr.provide('twtfltr', new Tweetfilter.Main());
    }
  })();

/*
 

// first try for new widget

<div class="component">
  <div class="module">
    <div class="flex-module">
      <div class="flex-module-header">
        <h3>Tweetfilter</h3> <small>· <a href="#" class="">Disable</a></small> <small>· <a href="#" class="">Options</a></small>
      </div>
    </div>
  </div>
</div>
  
//collect routes in firebug
  
var routes = localStorage.getItem('routes') || {};
if (typeof routes === 'string') routes = JSON.parse(routes);

var streams = localStorage.getItem('streams') || {};
if (typeof streams === 'string') streams = JSON.parse(streams);

var pages = localStorage.getItem('pages') || {};
if (typeof pages === 'string') pages = JSON.parse(pages);

function addinfo() {
  var pagename = twttr.app.currentPage()._instance.pageNameUnderscore,
      routename = twttr.router.getCurrentRoute().name,
      itemtype = twttr.app.currentPage()._instance.streamManager.getCurrent().streamItemType,
      streamkey = decodeURIComponent(twttr.app.currentPage()._instance.streamManager.getCurrent()._cacheKey),
      streamnamespace = streamkey.indexOf('}') !== -1 ? streamkey.split('{')[0] : streamkey;
      streamparams = streamkey.indexOf('}') !== -1 ? JSON.parse('{'+streamkey.split('{')[1]) : false;
//  console.log(pagename, routename, itemtype, streamnamespace, streamparams);
  
  if (!pages[pagename]) {
    pages[pagename] = [routename];
  } else if (!~pages[pagename].indexOf(routename)) {
    pages[pagename].push(routename);
  }
  if (!streams[itemtype]) {
    streams[itemtype] = [streamnamespace];
  } else if (!~streams[itemtype].indexOf(streamnamespace)) {
    streams[itemtype].push(streamnamespace);
  }
  routes[routename] = streamnamespace;
  localStorage.setItem('routes', JSON.stringify(routes));
  localStorage.setItem('pages', JSON.stringify(pages));
  localStorage.setItem('streams', JSON.stringify(streams));
  console.log(localStorage.getItem('streams'));
  console.log(localStorage.getItem('pages'));
console.log(localStorage.getItem('routes'));
}

addinfo();  
  
  
 */


} //TweetfilterScript

if (window.top === window.self && !document.getElementsByClassName('tfscript').length) { //don't run in twitter's helper iframes,  don't inject multiple times (bookmarklet)
  try {
    if (!window.localStorage || !JSON && ~~[] !== 0 || !Array.prototype.indexOf || !Array.prototype.map) {  //required browser/JS features;
      throw 'failed';
    }
    if (window.location.toString().match(/^https?\:\/\/twitter\.com\/(\?.*)?(#.*)?$/)) { //only run on twitter.com
      var scriptelement = document.createElement("script"); //create new <script> element
      scriptelement.id = 'tf'+(~~(Math.random()*100000));  //random id to prevent inline script caching
      scriptelement.className = 'tfscript';  //classname to identify script block
      var scripttext = TweetfilterScript.toString(); //assign the whole code to script
      scriptelement.text = scripttext.substring(scripttext.indexOf('{')+1, scripttext.lastIndexOf('}')); //unwrap the function
      document.body.appendChild(scriptelement); //inject the script 
    } else if (window.location.toString().indexOf('://twitter.com') === -1) { //currently not on twitter.com
      if (confirm("Tweetfilter only runs on twitter.com.\nDo you want to go there now?")) {
        window.location.href='https://twitter.com/'; 
      }
    }
  } catch(e) {
    alert('Tweetfilter can\'t run in this browser, it lacks some required javascript language features. Tweetfilter is tested on latest Firefox, Chrome or Opera.');
  }
}
