// ==UserScript==
// @name           Tweetfilter
// @namespace      Chilla42o
// @description    Tweetfilter is a highly customizable timeline filter for the twitter.com web client
// @version        2.0.4
// @include        http://twitter.com/
// @include        https://twitter.com/
// @include        http://twitter.com/#*
// @include        https://twitter.com/#*
// @match          http://twitter.com/
// @match          https://twitter.com/
// @match          http://twitter.com/#*
// @match          https://twitter.com/#*
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
var TweetfilterPrototype = function() {
  
  function Tweetfilter() {
// <debug>
    this.debug = true; //turn on debug. use firefox with firebug. will be _very_ verbous with standard settings. will probably slow down the script.
                       //if using debug, change _debuglevels, _debugfunctions and _debugskipfunctions to your needs. You may also want to set firebugs log limit to 5000 (500 is default).
    this._debuglevels = 'DLIWE'; //each char is a debug level - include in output (in order of importance): D=Debug, L=Log, I=Info, W=Warning, E=Error, empty string = show only function headers
    this._debugfunctions = [];// ['refreshcss', 'refreshfriends','refreshcursor','cursorfetched','cursorfetched']; //which functions to debug (whitelist). empty array = debug all functions
    this._debugskipfunctions = ['getlocaldate', 'checktweet', 'parselinks']; //which functions NOT to debug (blacklist) - only function header is shown. empty array = debug all functions
// </debug>   
    //gradient start colors for highlighting tweets
    this.color_reply = '#FFFAB4'; // tweets mentioning current user
    this.color_excluded = '#E5F4AC'; // tweets matching excluded filters
    this.color_me = '#FFFAB4'; // tweets written by current user
    
    this._heartbeat = 250; //amount of ms between poll ticks which perform various filter actions. don't set below 50
    this.version = '2.0.4'; //current visible script version

    this.options = { /* default option settings */
      /* widget options */
      'filter-minimized': false,  /* widget minimized state */
      /* global options */
      'hide-topbar': false,  /* auto-hide top bar */
      'hide-tweetbox': false,     /* main tweet box */
      'hide-question': true,     /* hide "What's happening" */
      'alert-message': true,      /* message alert when new direct messages received */
      'alert-sound-message': true,/* play sound when new direct messages received */
      'alert-mention': true,/* message alert when new mentions arrived */
      'alert-sound-mention': true,/* play sound when new direct messages received */
      /* options changing the dashboard */
      'compact-activities': false,  /* compact activities */
      'hide-wtf': false,     /* hide who to follow */
      'hide-trends': false,  /* hide trends */
      'hide-ad': true,  /* hide advertising */
      'hide-invite': true, /* hide invite friends */
      'minify-menu': false,  /* show only essential dashboard menu options */
      'fixed-dashboard': false,        /* fixed dashboard */
      /* options changing the stream */
      'filter-disabled': false, /* disable filter */
      'filter-inverted': false,   /* invert filter */
      'skip-me': true,       /* filter should skip my posts */
      'skip-mentionsme': true,  /* filter should skip tweets mentioning me */
      'filter-replies': false,  /* filter all replies */
      'filter-links': false,    /* filter all tweets with links */
      'filter-retweets': false, /* filter all retweets */
      'filter-media': false,    /* filter all media */
      'hide-promoted-tweets': false,  /* always hide promoted tweets */
      'hide-promoted-content': false, /* hide promoted content in the dashboard */
      'show-navigation': true,  /* show draggable top/bottom link menu */
      'show-via': true,         /* show tweet source */
      'show-usertime': true,    /* show user's local time near tweet time */
      'show-tab': true,         /* show "filtered"-tab */
      'show-br': true,          /* show line breaks in tweets */
      'add-selection': false,    /* show add to filter menu after simple text selection in tweets */
      'expand-new': true,       /* expand new tweets */
      'expand-links': false,    /* show expanded links */
      'expand-link-targets': false,    /* change links pointing to expanded url instead of shortened*/
      'small-links': false,     /* show small links */
      'highlight-me': false,      /* highlight what I wrote */
      'highlight-mentionsme':true, /* highlight replies to me */
      'highlight-excluded':true, /* highlight tweets matching exclusions */
      'search-realtime': true,    /* default searches to "all" tweets */
      'show-friends':false,     /* show who follows you and who you follow */
      'clear-stream-cache': true, /* reset stream cache after page switch - for speed issues */
      'tweets-fill-page': false /* load tweets until page is full */
    };                     
    this.disabledoptions = []; //currently disabled options. for check in getoption()
    //identify dashboard components, some changed by options
    this.components = {
      similarto: {
        path: 'div.user-rec-inner.user-rec-inner-similarities'
      },
      wtf: {
        path: 'div.user-rec-inner > ul.recommended-followers.user-rec-component',
        option: 'hide-wtf'
      },
      trends: {
        path: 'div.trends-inner', //what to search for to identify the component
        option: 'hide-trends' //which option depends on the component, will be activated when it's found
      },
      latest: {
        path: 'div.tweet-activity div.latest-tweet',
        option: 'compact-activities',
        callback: function(that, component) {
          that.createwishboard(component);
        }
      },
      invite: {
        path: 'div.invite-friends-component'
      },
      following: {
        path: 'div.following-activity-full'
      },
      youbothfollow: {
        path: 'div.social-context > div.you-both-follow'
      },
      activities: {
        path: 'div.your-activity.following-activity'
      },
      ad: {
        path: 'div.definition p.promo',
        option: 'hide-ad'
      },
      menu: {
        path: 'div.footer.inline-list',
        option: ['minify-menu']
      },
      stats: {
        path: 'ul.user-stats'
      },
      listmembers: {
        path: 'div.newest-list-members'
      },
      morelists: {
        path: 'div.more-lists'
      }
    };
    
    this.queries = [];  /* parsed queries (objects) */
    this.exclusive = []; /* exclusive filtered queries (ids) */
    
    this.friendstatus = {
      expires:0,
      uids: {}
    };
    
    this.status = {
      messagesinceid: -1, //id of last mention, is 0 if no mentions found
      mentionsinceid: -1, //id of last direct message, is 0 if no messages found
      foundcomponents: [],  //which components were found in findcomponents()
      initialized: false  //is widget created and settings loaded: influences setoption and poll behaviour
    };
    
    this.timeids = { //timeout and/or interval ids for special functions
    }
    
    this.polling = {
      tick: 0,         //count of ticks executed, mainly for debug
      timeoutid: -1,   //id returned by settimeout for next poll, to avoid multiple timeout calls, -1=can repoll
      suspend: false,  //immediately and permanently stop polling
      stop: true,      //stop poll after run of _poll()
      busy: false,     //is poll currently busy (already processing)
      working: false,
      events: { //possible events executed during poll. order matters!
        refreshoptions: false, //set enabled/disabled options
        parseitems: false, //parse through cached tweets (outside the dom)
        parsestream: false,  //parse through displayed tweets (in the dom)
        findcomponents: false, //try to find dashboard components
        setstreamtitle: false, //refresh stream title on the widget and the stream
        addclass: false,       //add class to <body> - used for layout options, spares css recreation
        removeclass: false,    //remove class from <body>
        refreshfriends: false, //fetch users following and followers
        refreshindex: false,   //rebuild the filter index
        refreshcss: false,     //refresh inline stylesheets
        refreshfilterlist: false,  //refresh the list of filters and exclusions on the widget
        refreshactivities: false,  //refresh compact activities display
        checkreceived: false,  //check for new messages / mentions
        parselinks: false,     //pick up links and expand or collapse them
        removeselection: false  //remove text selection
      },
      running: {}, //events currently running during the tick. populated from "queued" before tick is executed
      queued: {} //queued action events, in no specific order. added through method "poll()"
    };
    this.timezone = this.gettimezone();
    this.user = {}; //current user info
    this.nextid = 1;    /* next unique id for query. always incremented */
    this.queries = [];  /* parsed queries */
    this.stream = {
      key: '', //unique stream cachekey.
      mode: '', //tweets, user, links, relevance
      itemtype: '', //tweets, user
      status: '', //do not rely on checking (only) this var
      title: '',
      user: ''
    };
    this.stopchars = ' (){}[].,;-_#\'+*~´`?\\/&%$§"!^°'; //possible chars delimiting a phrase, for exact search. spares expensive regex match
    var basex = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ01234567890'; 
    this.basex = this._basemap(basex);
    this.base10 = this._basemap('0123456789');
    this.initretries = 10; //how many times try to initialize before giving up
    this.initialize();
  }
  
  //check minimum requirements, bind routed event and switch to current stream
  Tweetfilter.prototype.initialize = function() {   
    var that = this, has = 'hasOwnProperty', get = 'getElementById';
    if (window.jQuery && window.twttr) {
      if (!twttr.loggedIn) {
        return false;
      }
      if(document[get]('top-stuff') && document[get]('page-outer') && 
         twttr[has]('router') && twttr[has]('$doc') && twttr[has]('$elements') && twttr.$elements[has]('page') && 
         twttr[has]('app') && twttr[has]('currentUser'))
      {
        if (!this.checkrequirements()) { //browser must have local storage and native json
          this.showmessage('Tweetfilter can\'t work correctly on this browser. <br />It would probably work fine on latest <a href="http://www.mozilla.com/firefox">Firefox</a>, '+
                           '<a href="http://www.google.com/chrome">Chrome</a> or <a href="http://www.opera.com">Opera</a>.', {resident:true});
          return false;
        }
        this.fastbrowser = $.browser.webkit || ($.browser.mozilla && parseFloat($.browser.version.substr(0,3)) > 1.9);  //disable stream cache per default for all except webkit and firefox 4+
        this.options['clear-stream-cache'] = !this.fastbrowser;
        this.refreshuser();
        $('head').append( //create style containers
          '<style id="tf-layout" type="text/css"></style>', //contains main widget layout
          '<style id="tf-pane" type="text/css"></style>', //dynamic pane size
          '<style id="tf-friends" type="text/css"></style>', //display friend status, updated separately
          '<style id="tf-filter" type="text/css"></style>' //hide and show single tweets according to filters
        );
        $('div#top-stuff').attr({
          'data-over':0, //is mouse over top bar
          'data-focused':0 //is search field focused
        }).hover(function() {
          var topbar = $(this);
          topbar.attr('data-over', '1');
        }, function() {
          var topbar = $(this);
          topbar.attr('data-over', '0');
        }).delegate('#search-query', 'focus', function() {
          $('div#top-stuff').attr('data-focused', '1');
        }).delegate('#search-query', 'blur', function() {
          $('div#top-stuff').attr('data-focused', '0');
        });
        $('#search-form').unbind('submit').bind('submit', twttr.bind(this, function(e) {
                                                                                                    var f=_F('searchsubmit');
          var field = $('#search-query');
                                                                                                    _D(f, 'submitting search:', field.val());
          if (field.val()) {
            var route = twttr.router[(this.options['search-realtime'] ? 'searchRealtimePath' : 'searchResultsPath')]({query: field.val()});

                                                                                                    _D(f, 'new route:', route);
            twttr.router.routeTo(route);          
          } else {
            field.focus();
          }
          e.stopPropagation();
          e.stopImmediatePropagation();
          return false;
        }));
        //don't show hidden topbar when hovering a message notification
        $('#message-drawer').bind('mouseenter', function(e) { 
          e.stopPropagation();
          e.preventDefault();
          return false; 
        });
        window.scrollTo(0,0); //scroll to the top
        twttr.router.bind('routed', function() { 
          that.poll('refreshcss', ['filter', 'friends']);
        });
        $(document).bind('ajaxSuccess', function(event, request, settings) { 
          that.twttrajaxevent(event, request, settings); 
        }); //watch for ajax requests

        twttr.$win.bind("resize tf.resizepane", twttr.bind(this, function() {
                                                                                                    var f=_F('resizepane');
                                                                                                    _D(f, 'resizing pane');
          var cp = twttr.app.currentPage();
          var $detailsPane = cp.$find("div.details-pane:has(.inner-pane.active)"),
              $pageOuter = $("#page-outer"),
              pagePaddingTop = parseInt($pageOuter.css("padding-top"), 10),
              widgetheight = this.widget.height() * +!this.options['filter-minimized'];
          if ($detailsPane.length > 0) {
            var contentHeight = twttr.$win.height() - pagePaddingTop;
            var dpHeight = contentHeight - $detailsPane[0].offsetTop - 8;
            var dpcHeight = dpHeight - $detailsPane.find(".inner-pane.active .pane-toolbar").outerHeight() - widgetheight * +!this.options['filter-minimized'];
            dpHeight -= widgetheight;
            this.setcss('pane', 
              'div.details-pane { height: '+dpHeight+'px !important; }'+
              'div.details-pane .pane-components { height: '+dpcHeight+'px !important; }'
          );
          }           
        }));
        twttr.util.lazyBind(window, 'resize', function() {
          $(window).trigger('tf.resizepane');
        });
        this.createwidget();
        this.loadsettings();
        this.loadfriends();
        this.poll('refreshcss', ['layout']);
        this.poll('refreshfriends');
        this.poll('refreshfilterlist');
        this.poll('findcomponents', 3);
        this.status.initialized = true;
        this._poll();
        return true;
      }                                                                                             else _D('F:initialize', 'W:required twttr components not loaded, reinitializing.');
    }                                                                                               else _D('F:initialize', 'W:jquery or twttr not loaded, reinitializing');
                                                                                                    _D('F:initialize', 'reinitialize, ', this.initretries, 'retries left');
    if (this.initretries--) {
      setTimeout(function() {
        that.initialize();
      }, 1000); //reinitialize
      return false;
    }
    if (typeof twttr !== 'undefined') this.showmessage('Tweetfilter failed to initialize. You may try to refresh the page.', {resident:true});
    return false;
  };
  
  Tweetfilter.prototype.checkrequirements = function() {
    try { //need HTML5 local storage, native JSON and ECMA5 tilde operator
      return !!window.localStorage && !!JSON && ~~[] === 0;
    } catch(e) {
      return false;
    }
  };
  
  Tweetfilter.prototype.waitforstream = function() {
                                                                                                    var f=_F('waitforstream');
    var isloaded = true;
    try { 
      this.cp = twttr.app.currentPage()._instance;
      if (this.cp && !this.cp.streamManager) {
        this.stream.filterstream = false;
        return false;
      } else {
        this.stream.filterstream = true;
      }
      if (!this.cp.streamManager.hasOwnProperty('filtered')) {
        this.cp.streamManager.bind('switchTo', twttr.bind(this, function(e) { 
                                                                                                    _D('F:twttr', 'W:streammanager event triggered', e, arguments);
          this.poll('refreshcss', ['filter', 'friends']);
        }));
        this.cp.streamManager.bind('newItemsCountChanged', twttr.bind(this, function(e) { 
                                                                                                    _D('F:twttr', 'W:streammanager event triggered', e, arguments);
          this.poll('parseitems'); 
        }));
        this.cp.streamManager.filtered = true;
      }
      var cs = this.cp.streamManager.getCurrent();
      var isprotected = cs.params.hasOwnProperty('canViewUser') ? !cs.params.canViewUser : false; 
      isloaded = (isprotected || cs.$node.find('.stream-end').length || cs.items.length); //&& !cs._getMoreOldItemsLock && cs._loadedStreamOnce;
    } catch(e) {
      isloaded = false;
                                                                                                    _D(f, 'W:components not loaded', e);
    }
    if (!isloaded) {
      if (this.stream.status !== 'loading') {
                                                                                                    _D(f, 'W:stream is loading, resetting filter css');
        this.stream.status = 'loading';
        this.refreshfiltercss(true);
      }
      return false;
    } 
    if (!cs.hasOwnProperty('filtered')) {
                                                                                                    _D(f, 'I:new stream, binding events');
      cs.bind('didTweet doneLoadingMore streamEnd', twttr.bind(this, function(e) {
                                                                                                    _D('F:twttr', 'W:stream event triggered', e, arguments);
        this.poll('parseitems');
      }));
      if (!twttr.$elements.page.data('tweetfilter')) {
                                                                                                    _D(f, 'I:delegating events.');                                                                                                 
        twttr.$elements.page.delegate('.stream-item', 'click', twttr.bind(this, function(e) { return this.tweetclick();}))
                .delegate('a.tf', 'mousedown', twttr.bind(this, function(e) {this.tweetactionsclick(e);})) 
                .delegate('.tf-via > a', 'click', twttr.bind(this, function(e) {return this.tweetclickvia(e);}))
                .delegate('div.tweet-text', 'mousedown', twttr.bind(this, function(e) {return this.tweettextmousedown(e);}))
                .delegate('div.tweet-text', 'mouseup click', twttr.bind(this, function(e) {return this.tweettextmouseup(e);}))
                .delegate('ul.tf-menu', 'mouseleave', twttr.bind(this, function(e) {this.filtermenuleave(e);}))
                .delegate('.twitter-timeline-link', 'click', twttr.bind(this, function(e) {return this.tweetclicklink(e);}))
                .delegate('.twitter-hashtag', 'click', twttr.bind(this, function(e) { return this.tweetclickhashtag(e);}))
                .delegate('li.stream-tab-searches a[href]', 'mousedown', twttr.bind(this, function(e) { return this.savedsearchclick(e);}))
                .data('tweetfilter', 1);
        
      }                                                                                             
      cs.filtered = true;
    } 
    if (this.stream.key !== cs._cacheKey) {
      if (this.stream.status === 'switching') {
                                                                                                    _D(f, 'W: already switching, aborting!');
        return false;
      }
      if (this.options['clear-stream-cache'] && this.stream.key && this.cp.streamManager.streams.hasOwnProperty(this.stream.key)) {
                                                                                                    _D(f, 'W: clearing cache of previous stream', this.stream.key);
        
        delete this.cp.streamManager.streams[this.stream.key];
        delete this.cp.streamManager.streams[cs._cacheKey];
      }
      this.stream.status = 'switching';
                                                                                                    _D(f, 'W: now loading ', decodeURIComponent(cs._cacheKey), ' - was before: ', decodeURIComponent(this.stream.key));
      var streamkey = decodeURIComponent(cs._cacheKey);
      var pos = streamkey.indexOf('{');
      if (pos !== -1) {
        this.stream.params = JSON.parse(streamkey.substr(pos));
        this.stream.namespace = streamkey.substr(0, pos);
      } else {
        this.stream.namespace = streamkey;
        this.stream.params = {};
      }
      this.stream.isprotected = this.stream.params.hasOwnProperty('canViewUser') && this.stream.params.canViewUser === false;
      var whose = !this.stream.params.hasOwnProperty('screenName') || this.stream.params.screenName.toLowerCase() === this.user.name ? 'Your ' : '@'+this.stream.params.screenName+"'s ";
      this.stream.itemtype = cs.streamItemType;
      this.stream.mode = this.stream.params.hasOwnProperty('mode') ? this.stream.params.mode : this.stream.itemtype;
      this.stream.activetab = this.cp._activeTab;
      var filter = {retweets: true};
      switch(this.stream.namespace) {
        case 'Home':
          this.stream.title = 'Home timeline'; 
          break;
        case 'Mentions':
          this.stream.title = 'Mentions'; 
          break;
        case 'RetweetsByYou':
          this.stream.title = 'Retweets by you'; 
          filter.retweets = false;
          break;
        case 'RetweetsByOthers':
          this.stream.title = 'Retweets by others'; 
          filter.retweets = false;
          break;
        case 'YourTweetsRetweeted':
          this.stream.title = 'Your tweets, retweeted'; 
          break;
        case 'Search':
          this.stream.title = 'Search'; 
          switch (this.stream.params.mode) {
            case 'relevance':
              this.stream.title += ' <em>top tweets</em>'; 
              break;
            case 'tweets':
              this.stream.title += ' <em>all tweets</em>'; 
              break;
            case 'links':
              this.stream.title += ' <em>tweets with links</em>'; 
              break;
          }
          break;
        case 'List':
          this.stream.title = 'List <b>'+this.stream.params.listSlug+'</b>'; 
          break;
        case 'OwnLists':
          this.stream.title = whose+' Lists'; 
          break;
        case 'MessageStream':
          this.stream.title = 'Messages'; 
          break;
        case 'User':
          this.stream.title = whose+'Tweets'; 
        break;
        case 'Favorites':
          this.stream.title = whose+'Favorites'; 
        break;
        case 'Following':
          this.stream.title = 'Following'; 
        break;
        case 'Friends':
          this.stream.title = whose+'Friends'; 
        break;
        case 'FollowingTweets':
          this.stream.title = whose+'Timeline'; 
        break;
        case 'Followers':
          this.stream.title = whose+'Followers'; 
        break;
        case 'SocialContextStream': //you both follow
          this.stream.title = 'Your and '+whose+'Friends'; 
        break;
        case 'ListMembers':
          this.stream.title = 'Members of list <b>'+this.stream.params.listSlug+'</b>'; 
        break;
        case 'ListFollowers':
          this.stream.title = 'Followers of list <b>'+this.stream.params.listSlug+'</b>'; 
        break;
        case 'UserRecommendationsStream':
          this.stream.title = 'Who to follow: Suggestions'; 
        break;
        case 'SuggestionCategoryMembersStream':
        case 'SuggestionCategoriesStream':
          this.stream.title = 'Who to follow: Interests'; 
        break;
        case 'ContactImportServices':
          this.stream.title = 'Who to follow: Import contacts'; 
        break;
        default:
          this.stream.title = 'unknkown: '+this.stream.namespace;
          break;
      }

      this.stream.key = cs._cacheKey;   
      this.stream.status = 'ready';
      this.polling.suspend = false;
      this.polling.busy = false;
      this.poll('refreshoptions');
      this.poll('parseitems');  
      this.poll('parselinks');  
      
      this.poll('findcomponents', 3);
      this.poll('refreshcss', ['filter', 'layout', 'friends']);
      this.poll('refreshfilterlist');
      this.poll('setstreamtitle');            
                                                                                                    _D(f, 'W:stream switched', decodeURIComponent(this.stream.key));
      return true;
    } else { //stream is loaded
                                                                                                    _D(f, 'I:stream '+this.stream.namespace+' is ready');
      return true;
    }
                                                                                                    _D(f, 'W:stream is still loading');
    return false;      
  };
  
  Tweetfilter.prototype.refreshoptions = function() {
    var exclusivemode = this.exclusive.length > 0;
    switch(this.stream.itemtype) {
      case 'tweet':
        this.enableoption('filter-retweets', !this.options['filter-disabled'] && this.stream.namespace !== 'RetweetsByOthers' && this.stream.namespace !=='RetweetsByYou');
        this.enableoption('filter-links', !this.options['filter-disabled'] &&  (!this.stream.params.hasOwnProperty('mode') || this.stream.params.mode !== 'links'));
        this.enableoption(['filter-inverted'], !this.options['filter-disabled'] && !exclusivemode);
        this.enableoption(['filter-replies', 'filter-media'], !this.options['filter-disabled']);
        this.enableoption(['skip-mentionsme'], !this.options['filter-disabled'] && this.stream.namespace!=='Mentions' && !exclusivemode);
        this.enableoption(['show-friends'], this.friendstatus.expires > 0 && this.stream.namespace!=='YourTweetsRetweeted' && !(this.stream.namespace === 'User' && 
                                            this.stream.params.screenName.toLowerCase() === this.user.name));
        this.enableoption(['skip-me'], !this.options['filter-disabled'] && !exclusivemode && this.stream.namespace!=='YourTweetsRetweeted' && 
                                       !(this.stream.namespace === 'User' && this.stream.params.screenName.toLowerCase() === this.user.name));
        this.enableoption(['add-selection'], !this.options['filter-disabled']);
        this.enableoption(['highlight-me'], this.stream.namespace!=='YourTweetsRetweeted' && 
                                       !(this.stream.namespace === 'User' && this.stream.params.screenName.toLowerCase() === this.user.name));
        this.enableoption(['highlight-mentionsme'], true);
        this.enableoption(['highlight-excluded'], !this.options['filter-disabled']);
        break;
      case 'user':
        this.enableoption(['show-friends'], this.friendstatus.expires > 0);
        break;
      default:
        this.enableoption(['filter-inverted', 'filter-replies', 'filter-media', 'filter-retweets', 'filter-links', 'highlight-excluded', 'highlight-me', 'skip-me', 'show-friends', 'skip-mentionsme', 'add-selection'], false);
        break;
        
    }
    return true;
  };
  

  Tweetfilter.prototype.streamready = function() {
    return this.stream.status === 'ready';
  };
  
  //queue (and cleanup) events for next poll, fire poll if currently idle
  Tweetfilter.prototype.poll = function(event, params) {
    if (arguments.length > 0) {
      if (typeof params === 'undefined') {
        params = true;
      }
      if (this.polling.events.hasOwnProperty(event)) {
                                                                                                    _D('F:poll', 'queueing', event, ' for tick',this.polling.tick+1,'with params:', params);
        switch(typeof params) {
          case 'object': //merge object parameter
            if (typeof this.polling.queued[event] === 'object') { //array
              for (var p=0,len=params.length;p<len;p++) {
                if (!~this.polling.queued[event].indexOf(params[p])) {
                  this.polling.queued[event].push(params[p]);
                }
              }
              if (this.status.initialized) this._poll();
              break;
            }
            //not an params array, pass anything but false to the poll queue
          default:
            this.polling.queued[event] = params;
            if (this.status.initialized && params !== false) {
              this._poll();
            }
          break;
        }
                                                                                                    _D('F:poll', 'queued event ', event, ', params:', this.polling.queued[event]);
      }
    }
  };
  
 
  //core poll event: execute queued events in predefined order, detect stream change. stop polling if no events left.
  Tweetfilter.prototype._poll = function() {
    if (!this.polling.busy) {
      if (!this.polling.working) {
        this.polling.working = true;
        this.widget.toggleClass('busy', true);
      } 
      var params = false, result, repeating = false, runsleft = 0;
                                                                                                    _D('F:_poll', 'I:running poll tick', ++this.polling.tick);
      this.polling.busy = true;      
      this.polling.running = $.extend({}, this.polling.running, this.polling.queued);
      this.polling.queued = {}
      this.polling.stop = true;
      for (var e in this.polling.events) {
        if (this.polling.suspend) {
          this.polling.working = false;
          this.widget.removeClass('busy');

                                                                                                    _D('F:_poll', 'W:polling suspended by trigger!');
          return;        
        }
        if (this.polling.running.hasOwnProperty(e) && typeof this[e] === 'function' && this.polling.running[e] !== false) {
          if (typeof this.polling.running[e] === 'number') {
            runsleft = this.polling.running[e]--;
            repeating = true;
            params = false;
          } else {
            repeating = false;
            params = this.polling.running[e];
          } 
          if (this.waitforstream()) {
            if ((result = this[e](params)) ||  (repeating && runsleft <= 0)) {
                                                                                                    _D('F:_poll', 'I:called function', e, 'returned', result,', repeating call:', repeating, ' - runs left', runsleft);
              this.polling.running[e] = false;
            } else {
                                                                                                    _D('F:_poll', 'W:called function', e, 'returned', result, 'requeueing! repeating call: ', repeating, ' - runs left: ', runsleft);
              this.polling.stop = false;
            }
          } else { //waitforstream failed: not loaded or not a valid stream
                                                                                                  _D('F:_poll', 'W:waitforstream still waiting!');
            if (!this.streamready()) {
              this.polling.stop = false;
                                                                                                  _D('F:_poll', 'W:stream is not ready, breaking!');
              break; 
            }
          }
        }
      }
      for (var q in this.polling.queued) {
                                                                                                    _D('F:_poll', 'W:NOT stopping, found queued:', q, this.polling.queued);
        this.polling.stop = false;
        break;
      }
      if (!this.polling.stop) {
                                                                                                    _D('F:_poll', 'W:breathing before next tick');
        this._breathe();
        return;
      } else {
                                                                                                    _D('F:_poll', 'W:stopping, nothing queued!');
      }
      this.widget.removeClass('busy');
      
      this.polling.working = false;
                                                                                                    _D('F:_poll', 'W:polling stopped.');
      this.polling.busy = false;
    }                                                                                               
  };
  
  //give a break before next poll
  Tweetfilter.prototype._breathe = function() {
                                                                                                    _D('F:_breathe', 'D:breathing '+this._heartbeat+'ms in tick '+this.polling.tick+'!');
    if (this.polling.timeoutid === -1) {
      this.polling.timeoutid = setTimeout(twttr.bind(this, function () {
        this.polling.busy = false;
        this.polling.timeoutid = -1;
        this._poll();
      }), this._heartbeat);
    } else _D('F:_breathe', 'D:NOT repolling tick '+this.polling.tick+', already queued!');
  };
  
  Tweetfilter.prototype.refreshuser = function() {
    this.user = {
      id: twttr.currentUser.idStr, //id used as namespace for settings.
      name: twttr.currentUser.screenName.toLowerCase(), //lowercase name used for matches
      screenname: twttr.currentUser.screenName
    };
    //<debug>
    //set to another (popular) user to heavily test "show friend status""
    //this.user.id= '';
    //this.user.name= '';
    //</debug>
  };
  
  Tweetfilter.prototype.refreshcolors = function() {
    var user = twttr.profileUser && twttr.profileUser.screenName === this.cs().screenName ? twttr.profileUser : twttr.currentUser;
    this.colors = {
      background: '#'+user.profileBackgroundColor,
      link: '#'+user.profileLinkColor,
      border: '#'+user.profileSidebarBorderColor,
      fill: '#'+user.profileSidebarFillColor,
      text: '#'+user.profileTextColor,
      reply: this.color_reply, 
      excluded: this.color_excluded,
      me: this.color_me,
      //the following are defined by twitter's timeline layout, not customizable by user
      darktext: '#444',
      lighttext: '#999'
    };
  };
  
  Tweetfilter.prototype._basemap = function(basestr) {
    var basemap = {};
    for (var i=0,imax=basestr.length; i<imax; i++) {
      basemap[basestr.charAt(i)] = i;
    }
    basemap.length = basestr.length;
    basemap._s = basestr;
    return basemap;
  };
 
  Tweetfilter.prototype.encodenum = function(numstr) {
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
  };
  
  Tweetfilter.prototype.decodenum = function(numstr) {
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
  };
  
  Tweetfilter.prototype.savefriends = function() {
                                                                                                    var f=_F('savefriends');
    var friendstatus = this.getvalue(':FRIENDSTATUS:', {});
    if (!friendstatus.expires || friendstatus.expires < this.friendstatus.expires && friendstatus.userid !== this.user.id) {
      //check if friendstatus needs update
                                                                                                    _D(f, 'refreshing friend status', friendstatus.expires,'<',this.friendstatus.expires);
      friendstatus = { 
        expires: this.friendstatus.expires,
        userid: this.user.id,
        following: {}, 
        follower: {}, 
        mutual: {} 
      };
      for (var userid in this.friendstatus.uids) {
        switch(this.friendstatus.uids[userid]) {
          case 1:friendstatus.following[this.encodenum(userid)]=0;break;
          case 2:friendstatus.follower[this.encodenum(userid)]=0;break;
          case 4:friendstatus.mutual[this.encodenum(userid)]=0;break;
        }
      }
      this.setvalue(':FRIENDSTATUS:', friendstatus);
    }
  };
  
  Tweetfilter.prototype.loadfriends = function() {
                                                                                                    var f=_F('loadfriends');
    this.savesettings();  //this cleans up eventually old friend status freeing space
    var friendstatus = this.getvalue(':FRIENDSTATUS:', {});
    if (friendstatus.expires && friendstatus.expires > this.friendstatus.expires && friendstatus.userid === this.user.id) {
                                                                                                    _D(f,'now loading friends from localstorage:', this.friendstatus.expires, '<', friendstatus.expires);
      var uid;
      for (uid in friendstatus.following) {
        this.friendstatus.uids[this.decodenum(uid)] = 1;
      }
      for (uid in friendstatus.follower) {
        this.friendstatus.uids[this.decodenum(uid)] = 2;
      }
      for (uid in friendstatus.mutual) {
        this.friendstatus.uids[this.decodenum(uid)] = 4;
      }
      this.friendstatus.expires = friendstatus.expires;
      this.poll('refreshcss', ['friends']);
    }
  };
  
  //load settings from local storage. executed after widget was created
  Tweetfilter.prototype.loadsettings = function(imported) {
                                                                                                    var f=_F('loadsettings');
                                                                                                    _D(f, this.user, twttr.currentUser.id, twttr.currentUser.screenName);
    if (!this.user.hasOwnProperty('id') || this.user.id != twttr.currentUser.id) {
      this.refreshuser();
    }
    var settings = this.getvalue(':TWEETFILTER:', {});
                                                                                                    _D(f,'settings in localstorage', settings);
    if (!settings.hasOwnProperty(this.user.id)) {
      settings[this.user.id] = {};
    }
    if (typeof imported !== 'undefined') {
      settings = imported;
                                                                                                    _D(f,'I:imported', settings);
    } else {
      settings = settings[this.user.id];
    }
                                                                                                    _D(f,'loaded:', settings);
    if (typeof imported === 'undefined') {
      
      this.queries = [];
      if (typeof settings.queries === 'undefined') {
                                                                                                    _D(f,'W:loaded queries are undefined');
        settings.queries = [];
      }
      if (typeof settings.options === 'undefined') {
                                                                                                    _D(f,'W:loaded options are undefined');
        settings.options = {};
      }
                                                                                                    _D(f,'loading', settings.queries.length,'queries:', settings.queries);
      for (var q=0,len=settings.queries.length,query;q<len && (query = settings.queries[q]);q++) {
        if (query.hasOwnProperty('query')) {
          this.addquery(query.query, query.enabled);
        }
      }
                                                                                                    _D(f,'loading options', settings.options);
      for (var option in this.options) {
        this.setoption(option, typeof settings.options[option] === typeof this.options[option] ? settings.options[option] : this.options[option], true);
        $('[data-option='+option+']', this.widget).toggleClass('checked', this.options[option]);
        if (option === 'filter-inverted') {
          $('.passed a[data-option="'+option+'"]', this.widget).toggleClass('checked', !this.options[option]);
        }
      }
      this.status.messagesinceid = settings.hasOwnProperty('messagesinceid') ? settings.messagesinceid : -1;
      this.status.mentionsinceid = settings.hasOwnProperty('mentionsinceid') ? settings.mentionsinceid : -1;
      var canplaysound = Modernizr.audio && (Modernizr.audio.mp3 || Modernizr.audio.ogg); 
      if (!canplaysound) { //not able to play mp3 or ogg, disable sound notification options
        this.options['alert-sound-message'] = this.options['alert-sound-mention'] = false;
        this.enableoption(['alert-sound-message', 'alert-sound-mention'], false);
      }
      if (settings.version && settings.version !== this.version) {
        this.showmessage('Tweetfilter has been updated!<br /><a href="http://tweetfilter.org/#whatsnew" target="_blank">See what\'s new</a>', {resident: true});
      }
    } //need to refresh after import
    this.savesettings(imported);
    if (typeof imported !== 'undefined') {
      location.reload(true);
    }
  };
  
  //save settings in local storage
  Tweetfilter.prototype.savesettings = function(imported) {   
    var settings = this.getvalue(':TWEETFILTER:', {});
    if (!settings.hasOwnProperty(this.user.id)) {
      settings[this.user.id] = {};
    }
    
    if (typeof imported != 'undefined') {
      settings[this.user.id].version = this.version;
      settings[this.user.id] = imported;
      settings[this.user.id].messagesinceid = this.status.messagesinceid > 0 ? this.status.messagesinceid : -1;
      settings[this.user.id].mentionsinceid = this.status.mentionsinceid > 0 ? this.status.mentionsinceid : -1;
    } else {
      settings[this.user.id] = { 
        queries: [],
        options: this.options,
        version: this.version,
        messagesinceid: this.status.messagesinceid > 0 ? this.status.messagesinceid : -1,
        mentionsinceid: this.status.mentionsinceid > 0 ? this.status.mentionsinceid : -1
      };
      for (var q=0,len=this.queries.length,query;q<len && (query=this.queries[q]);q++) {
        settings[this.user.id].queries.push({
          query: query.raw,
          enabled: query.enabled
        });
      }
    }
                                                                                                    _D('F:savesettings', settings);
    this.setvalue(':TWEETFILTER:', settings);
  };
  
  Tweetfilter.prototype.compareversion = function(v1, v2) { //returns: 1 if v1 > v2, 2 if v2 > v1, 0 if equal
    if (v1 === v2) return 0;
    var v = (v1+'|'+v2).replace(/\./g,'').split('|');
    return +v[0] > +v[1] ? 1 : 2; 
  };

  //attempts to find dasboard components if one is missing.
  Tweetfilter.prototype.findcomponents = function() {
    var dashboard = twttr.app.currentPage()._instance.$node.find(".dashboard");
    var components = $("> div.component", dashboard);
    var enableoptions = [], disableoptions = [];
    this.status.foundcomponents = [];
    for (var cssclass in this.components) {
      var component = this.components[cssclass];
      var container = $('div.component '+component['path'], dashboard).closest('div.component');
      if (container.length) {
        this.status.foundcomponents.push(cssclass);
                                                                                                  _D('F:findcomponents', 'I:found component', cssclass, 'option:', component.option);
        if (component.option) {
          enableoptions.push(component.option);
        } 
        if (!container.hasClass('tf')) {
          container.addClass('tf '+cssclass);
          if (typeof component['callback'] === 'function') {
            component.callback(this, container);
          }
        }
      } else if (component.option) {
        disableoptions.push(component.option);
      }
    }
    if (enableoptions.length) this.enableoption(enableoptions);
    if (disableoptions.length) this.enableoption(disableoptions, false);
    
                                                                                                    _D('F:findcomponents', 'identifying', components.length, 'components');
    return !$('> div.component:not(.tf):visible').length; //in poll functions, return true will stop the repoll
  };
  
  Tweetfilter.prototype.addclass = function(classnames) {
    $('body').toggleClass('tf-'+classnames.join(' tf-'), true);
    return true;
  };
  
  Tweetfilter.prototype.removeclass = function(classnames) {
    $('body').removeClass('tf-'+classnames.join(' tf-'));
    return true;
  };

  //enable an option after required components were detected
  Tweetfilter.prototype.enableoption = function(option, enabled) {
    
    if (typeof enabled === 'undefined') enabled = true;
    if (!$.isArray(option)) option = [option];
    for (var i=0,len=option.length,ia;i<len;i++) {
                                                                                                    _D('F:enableoption', (enabled ? 'I:enable' : 'W:disable')+' option', option);
      ia = ~~this.disabledoptions.indexOf(option[i]);
      if (ia !== -1 && enabled) {
        this.disabledoptions.splice(ia,1);          
      } else if (ia === -1 && !enabled) {
        this.disabledoptions.push(option[i]);
      }
      if (this.widget) $('[data-option="'+option[i]+'"]', this.widget).closest('li').toggleClass('disabled', !enabled);
                                                                                                    _D('F:enableoption', 'D:currently disabled options:', this.disabledoptions);
                                                                                                    if (this.widget)  _D('F:enableoption', 'D:found options:', $('[data-option="'+option[i]+'"]', this.widget).length, 'setting "disabled" class to', !enabled);
    }
  };
  
  Tweetfilter.prototype.getoption = function(option) {
    return this.options[option] && !~this.disabledoptions.indexOf(option);
  };

  //set an option
  Tweetfilter.prototype.setoption = function(option, status, clicked) {
                                                                                                    _D('F:setoption','setting option', option, 'to', status, 'clicked:', clicked);
    if (typeof clicked !== 'boolean') { //will not refresh styles when not clicked
      clicked = false;
    }
    if (typeof status === 'undefined' || status === null) { //toggle option with null status
      status = !this.options[option];
    }
    if (typeof status !== 'string') {
      status = !!status; //has to be boolean or a string
    }
    var immediaterefresh = false;
    var refresh = []; //which styles to refresh
    
    if (option === 'filter-passed') {
      option = 'filter-inverted'; 
      status = false;
    }
    
    if (this.options.hasOwnProperty(option)) {
      this.options[option] = status; //set option
    } else {
                                                                                                    _D('F:setoption','W:ignoring invalid option', option);
      return false;
    }
    switch(option) {
      /* options changing the stream */
      case 'filter-disabled': /* disable filter */
        $('#tf-filter-add').trigger('blur').attr('disabled', status);
        this.refreshoptions();
        this.poll('setstreamtitle');
        refresh = ['filter'];
      break;
      case 'filter-inverted': /* show only filtered*/
        if (clicked) {
          if (this.exclusive.length) {
            this.exclusive = [];
            this.refreshfilterlist();
            this.refreshoptions();
          }
          refresh = [];
          this.refreshfiltercss();
          this.setstreamtitle();
          window.scrollTo(0,0); //scroll to top when switching between timeline and filtered
        } else {
          this.poll('setstreamtitle');
          immediaterefresh = this.streamready(); //make switch from/to inverted more fluid
          refresh = ['filter'];
        }
        if (this.widget) this.widget.toggleClass('inverted', status);
      break;
      case 'filter-minimized': /* toggle tweetfilter layout */
        if (this.hasOwnProperty('widget') && typeof this.widget !== 'undefined') {
          this.widget.toggleClass('minimized', status);
          $(window).trigger('tf.resizepane');
        }
      break;
      case 'skip-me': /* filter my posts */
      case 'skip-mentionsme': /* filter tweets mentioning me */
      case 'filter-replies': /* filter all replies */
      case 'filter-links': /* filter all tweets with links */
      case 'filter-retweets': /* filter all retweets */
      case 'filter-media':  /* filter all media */
      case 'hide-promoted-tweets':  /* hide all promoted tweets */
      case 'tweets-fill-page':  /* load tweets until page is full */
        refresh = ['filter'];
      break;
      case 'search-realtime':
        $('#search-form').attr('action', status ? '/search/realtime' : '/search');
      break;
      case 'compact-activities':  /* compact activities */
        if (!status && this.timeids.refreshactivities && this.timeids.refreshactivities !== -1) {
          window.clearInterval([this.timeids.refreshactivities, this.timeids.refreshactivities=-1][0]);
        } else if (status && !this.timeids.refreshactivities || this.timeids.refreshactivities === -1) {
          this.timeids.refreshactivities = window.setInterval(twttr.bind(this, function() {
            this.poll('refreshactivities');
          }), 100000); //refresh display once every 100 seconds 
          this.poll('refreshactivities');
        }
      /* deeper */
      /* options changing the global layout */
      case 'hide-topbar':   /* auto-hide top bar */
      case 'expand-last':   /* show full last tweet */
      case 'hide-question':     /* hide "what's happening?" */
      case 'hide-tweetbox':     /* hide main tweet box */
      case 'hide-wtf':     /* hide who to follow */
      case 'hide-promoted-content':     /* hide promoted trends, wtf */
      case 'hide-trends':  /* hide trends */
      case 'hide-invite':  /* hide invite friends */
      case 'minify-menu':  /* hide optional menu items */
      case 'hide-ad':      /* hide ad */
      case 'fixed-dashboard':  /* fixed dashboard */
      case 'show-via': /* show tweet source */
      case 'show-usertime': /* show tweet source */
      case 'show-br': /* show line breaks in tweets */
      case 'small-links': /* show small links */
        this.poll((status ? 'add' : 'remove') +'class', [option]);
      break;
      case 'highlight-me': /* highlight tweets written by me */
      case 'highlight-mentionsme': /* highlight tweets mentioning me */
        refresh = ['filter'];
        this.poll((status ? 'add' : 'remove') +'class', [option]);
      break;
      case 'highlight-excluded': /* highlight tweets matching a filter exclusion */
        refresh = ['filter'];
        this.poll((status ? 'add' : 'remove') +'class', [option]);
      break;
      case 'expand-new': /* expand new tweets */
        if (status) {
          var newtweetsbar = $('div#new-tweets-bar');
          if (newtweetsbar.length) newtweetsbar.trigger('click');
        }
        this.poll((status ? 'add' : 'remove') +'class', [option]);
      break;
      case 'expand-links': /* show expanded links */
        this.poll('parselinks');
      break;
      case 'alert-mention':
      case 'alert-message':
        this.poll('checkreceived');
      break;
      case 'alert-sound-mention':
      case 'alert-sound-message':
        this.poll('checkreceived');
        if (this.status.initialized) {
          this.showmessage((option.indexOf('mention') > -1 ? 'Mention' : 'Message')+' alert '+(status ? 'enabled' : 'disabled')+'.', {type:option});
          if (status) {
            this.playsound();
          }
        }
      break;
      case 'show-friends':
        this.poll((status ? 'add' : 'remove') +'class', [option]);
        refresh = ['friends'];
        this.poll('refreshfriends');
      break;
    }
    if (clicked && !!this.widget) {
      $('[data-option='+option+']', this.widget).closest('li').toggleClass('checked', status);
    }
    if (clicked && this.status.initialized) { //do not refresh during loadsettings or manual calls
      this.savesettings();
      if (refresh.length) {
        if (immediaterefresh) {
          this.refreshcss(refresh);
        }else {
          this.poll('refreshcss', refresh);
        }
      }
    }
    return true;
  };
  
  Tweetfilter.prototype.setstreamtitle = function() {
                                                                                                    var f=_F('setstreamtitle');
    //set on widget                                                                                 
    $('#tf-stream-title').html(this.stream.title);
                                                                                                    _D(f, 'I:'+this.stream.title);
    var sm, streamtitle = this.stream.title;
    if ((sm = twttr.app.currentPage().getInstanceProperty('streamManager'))) {
                                                                                                    _D(f, 'I:', this.stream);
      if ($('.subtabs', sm.$titleContainer).length) { //don't touch stream title containing subtabs
        return true;
      }
     //set in stream
      var textcontainer = $('> h2', sm.$titleContainer);
      if (!textcontainer.length) {
        textcontainer = $('<h2></h2>');
        sm.$titleContainer.prepend(textcontainer);
      } 
                                                                                                    _D(f, 'textcontainer:', textcontainer, 'text:', textcontainer.text());
      if (textcontainer.is(':empty')) {
                                                                                                    _D(f, 'I:textcontainer is empty!');

        
        textcontainer.html(this.stream.title);
      } else if ($('span.stream-tab-title-inner', textcontainer).length) {
        textcontainer = $('span.stream-tab-title-inner', textcontainer);
      } else if ($('>span', textcontainer).length) {
        textcontainer = $('>span', textcontainer);
      }
                                                                                                    _D(f, 'textcontainer:', textcontainer, 'text:', textcontainer.text());
      streamtitle = textcontainer.text(); 
      if (streamtitle.length > 42+7) {
        streamtitle = streamtitle.substr(0, 42+7)+'...';
      }
      var exclusivemode = this.exclusive.length > 0;

      if (!this.options['filter-disabled'] && this.stream.itemtype === 'tweet') {
        $('> em', textcontainer).remove();
        if (exclusivemode || this.options['filter-inverted']) { //viewing "Filtered" tweets
          textcontainer.prepend('<em>Filtered </em>');
        }         
        $('> div.tf', textcontainer).remove();
        if (exclusivemode) {
          var filterlist = [];
          if (~this.exclusive.indexOf('replies')) {
            filterlist.push(['<span class="replies"><b>Replies</b></span>'])
          }
          if (~this.exclusive.indexOf('retweets')) {
            filterlist.push(['<span class="retweets"><b>Retweets</b></span>'])
          }
          if (~this.exclusive.indexOf('links')) {
            filterlist.push(['<span class="links"><b>Tweets with links</b></span>'])
          }
          if (~this.exclusive.indexOf('media')) {
            filterlist.push(['<span class="media"><b>Tweets with media</b></span>'])
          }
          for (var i=0, len=this.queries.length, elen=this.exclusive.length, found=0; i<len && found<elen; i++) {
            if (~this.exclusive.indexOf(this.queries[i].id)) {
              filterlist.push(['<span class="'+this.queries[i].type+'">'+this.queries[i].label+'</span>']);
              found++;
            }
          }
          textcontainer.append('<div class="tf">Filters: '+filterlist.join(', ')+'</div>');
        }
      } else { //filter disabled: simple stream title
        $('> em, > div.tf', textcontainer).remove();
        textcontainer.html(streamtitle);
      }
      return !!this.stream.title;
    }
    return false; 
  };
  
  Tweetfilter.prototype.gettimezone = function() {
    var d = new Date(), jan = new Date(d.getFullYear(),0,1), jul = new Date(d.getFullYear(),6,1), 
        stdoffset = Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
    return {
      dst: +(d.getTimezoneOffset() < stdoffset) * 3600000, //daylight saving time, in ms
      stdoffset: stdoffset * 3600000, //standardoffset: discrepancy between time in jan and jul
      offset: d.getTimezoneOffset() * 3600000 //current timezone offset, in ms (=gmt + dst) - see https://github.com/Tweetfilter/tweetfilter.github.com/issues/7
    };
  }; 
  
  Tweetfilter.prototype.getlocaldate = function(utc_str, utc_offset, timezone) {
                                                                                                    var f=_F('getlocaldate');
    if (typeof utc_offset !== 'number') {
      return {time: '', timezone: ''};
    }
    var utc_date = new Date(utc_str),
        local_date = new Date(utc_date.getTime() + utc_offset * 1000 + this.timezone.offset * 3600000),
        gmt = (utc_offset / 3600);
                                                                                                    _D(f, 'tweet timestamp:', utc_str, 'utc offset:', utc_offset);
                                                                                                    _D(f, 'utc time (gmt +0):', ('00'+utc_date.getHours()).substr(-2)+':'+('00'+utc_date.getMinutes()).substr(-2));
                                                                                                    _D(f, 'local time (gmt '+(gmt>=0?'+':'')+gmt+'):', ('00'+local_date.getHours()).substr(-2)+':'+('00'+local_date.getMinutes()).substr(-2));
    return {
      time: ('00'+local_date.getHours()).substr(-2)+':'+('00'+local_date.getMinutes()).substr(-2),
      timezone: this.encodehtml(timezone)+' GMT '+(gmt >= 0 ? '+' : '')+gmt
    };
  };
  
  //process items combining html stream and cache
  Tweetfilter.prototype.parseitems = function() { 
                                                                                                    _D('F:parseitems', arguments);
    var cs, i=0, data, filteredcount, nextid, itemcount, d, gmt, utc;
    if (!(cs = this.cs())) return false;
    switch(cs.streamItemType) {
      case 'tweet': //tweet stream
        if (!cs.hasOwnProperty('filter')) {
          cs.filter = { //create filter index in cached stream
            items: [],    //all cleaned, processed items to use with checktweet
            itemids: {},  //twttr-api ids associated with internal ids
            userids: {},  //map usernames to ids
            users: [],    //user index with uid as primary key. for fast user filter (or to list all users in timeline). also contains retweet users.
            tweets:[],    //all tweets (custom ids)
            hidden: [],   //tweets currently marked as hidden (during refreshcss(filter))
            replies: [],  //replies and tweets beginning with @mention
            retweets: [], //retweets in timeline
            media: [],    //tweets containing media
            matches: [],  //tweets matching filter queries, two dimensional index
            excluded: [],  //tweets matching excluded queries, two dimensional index
            links: [],    //tweets containing links (* contains also media, because media is posted along with a link)
            mentionsme: [], //tweets mentioning current user
            me: [],         //tweets by current user
            promoted: []      //promoted tweets
          };
        }
                                                                                                  _D('F:parseitems', 'items in cache:', cs.items.length, ' already processed:', cs.filter.items.length);
        if (cs.filter.items.length < cs.items.length) {
          i = 0;
          filteredcount = cs.filter.items.length;
          nextid = cs.filter.items.length;
          itemcount = cs.items.length;
          while (filteredcount < itemcount) {
            if (i < filteredcount) {
              if (cs.filter.itemids.hasOwnProperty(cs.items[i].id)) {
                i = filteredcount;
              }
            }
            data = cs.items[i];
            var tweet = {
              id: nextid++,                                    //small unique id in stream. tweet in stream will get id="tf<id>"
              tweetid: data.id,                                //real (long) item id 
              userid: data.user.idStr,                         //for friend status
              screenname: data.user.screenName,                //for message icon
              name: data.user.attributes.name.toLowerCase(),   //for name filter
              username: data.user.screenName.toLowerCase(),    //for user filter
              via: data.source,                                //to display in tweets (show-via)
              source: data.source.toLowerCase(),               //for source filter
              text: data.text.toLowerCase(),                   //for simple filters (including hashtags, mentions, links)
              isreply: data.isReply,                           //for replies filter
              haslinks: data.entities.urls.length > 0,         //for links filter
              matches: []                                      //found matches to filters. to avoid multiple tweet filtering
           // isme: false,                                     //for excluding own posts (only set if "true")
           // mentionsme: false,                               //for highlighting/excluding mentions (only set if "true")
           // ismedia: false,                                  //for all media filter (set in parsestream, only set if "true")
           // ispromoted: false,                                 //is promoted tweet (only set if "true")
           // rt: {                                            //retweet info (only set on retweets), for all retweets filter
           //   userid: '',                                    //for friend status, not set on classic retweets
           //   username: '',                                  //for user filter (filter a user also filters his retweets)
           //   via: '',                                       //to display in retweets near OP's-source
           //   source: '',                                    //for source filter (this way the filter can't be tricked by retweets of unwanted bots)
           //   friend: -1                                     //friend status with retweeting user
           // },
           // maybe for future use:
           // imageurl: data.user.attributes.profile_image_url,
           // userwebsite: data.user.url,
            };
            if (tweet.userid === this.user.id) {
              tweet.isme = true;
            }
            if (data.isreply) tweet.isreply = true;
            if (tweet.source.indexOf('<') > -1) {
              tweet.source = tweet.source.replace(/<\S[^><]*>/g, ''); //remove any html from source
            }
            if (data.hasOwnProperty('retweetingStatus')) {
              tweet.rt = {
                userid: data.retweetingStatus.user.idStr,
                username: data.retweetingStatus.user.screenName.toLowerCase(),
                via: data.retweetingStatus.source,
                source: data.retweetingStatus.source.toLowerCase()
              };
              if (tweet.rt.source.indexOf('<') > -1) {
                tweet.rt.source = tweet.rt.source.replace(/<\S[^><]*>/g, ''); //remove any html from rt source
              }
              if (tweet.rt.userid === this.user.id) { //retweet by me
                tweet.isme = true;
              }
            }
            if (data.impressionId) {
              tweet.ispromoted = true;
            }
            tweet.localtime = this.getlocaldate(data.createdAt, data.user.utcOffset, data.user.timeZone);
            if (data.entities.user_mentions.length) { //tweet contains mentions
              var mention, mentioned;
              for (var m=0, mlen=data.entities.user_mentions.length; m<mlen; m++) {
                mention = data.entities.user_mentions[m];
                mentioned = mention.screen_name.toLowerCase();
                if (mentioned === this.user.name) {
                  tweet.mentionsme = true;
                                                                                                  // _D('F:parseitems','L:found mention of ', this.user.name);
                }
                if (mention.indices[0] === 0) {
                  tweet.isreply = true; //start of a discussion may not be a reply to a specific tweet, but is still a reply for user's eye, so for the filter
                } else if (!tweet.rt && mention.indices[0] === 3 && tweet.text.indexOf('rt ')===0) { //possible classic retweet/quote/mention: RT @username
                  tweet.rt = {username: mentioned};
                }
                                                                                                  // _D('F:parseitems','L:mention found: @', mentioned, 'at', mention.indices);
              }
            }
            tweet.text = this.decodehtml($.trim(tweet.text));
            //feed filter index
            cs.filter.items.push(tweet);
            if (cs.filter.users.hasOwnProperty(tweet.username)) {
              cs.filter.users[tweet.username].push(tweet.id);
            } else {
              cs.filter.users[tweet.username] = [tweet.id];
              cs.filter.userids[tweet.username] = tweet.userid;
            }
            if (tweet.rt) {
              if (cs.filter.users.hasOwnProperty(tweet.rt.username)) {
                cs.filter.users[tweet.rt.username].push(tweet.id);
              } else {
                cs.filter.users[tweet.rt.username] = [tweet.id];
              }
              if (tweet.rt.userid && !cs.filter.userids.hasOwnProperty(tweet.rt.username)) {
                cs.filter.userids[tweet.rt.username] = tweet.rt.userid;
              }
            }
            cs.filter.tweets.push(tweet.id);
            if (tweet.isreply) cs.filter.replies.push(tweet.id);
            if (tweet.rt) cs.filter.retweets.push(tweet.id);
            if (tweet.haslinks) cs.filter.links.push(tweet.id);
            if (tweet.isme) cs.filter.me.push(tweet.id);
            if (tweet.ispromoted) cs.filter.promoted.push(tweet.id);
            if (tweet.mentionsme && this.stream.namespace !== 'Mentions') cs.filter.mentionsme.push(tweet.id);
            cs.filter.itemids[tweet.tweetid] = tweet.id;            
            this.checktweet(tweet);
            filteredcount++;
            i++;
          }
                                                                                                    _D('F:parseitems','I:items parsed!');
        }
        this.poll('parsestream');    //always trigger parsestream, new items are already cached before they are displayed 
        break;
      case 'user': //user stream 
        if (!cs.hasOwnProperty('filter')) {
          cs.filter = { //create filter index in cached stream
            items: [],    //all cleaned, processed items to use with checktweet
            itemids: {},  //twttr-api ids associated with internal ids
            users: {}    //timeline index with user as primary key. 
          };
        }
                                                                                                    _D('F:parseitems', 'items in cache:', cs.items.length, ' already processed:', cs.filter.items.length);
        if (cs.filter.items.length < cs.items.length) {
          i = 0;
                                                                                                    _D('F:parseitems', 'parsing from',cs.filter.items.length,'to',cs.items.length-1);
          filteredcount = cs.filter.items.length;
          nextid = cs.filter.items.length;
          itemcount = cs.items.length;
          while (filteredcount < itemcount) {
            if (i < filteredcount) {
              if (cs.filter.itemids.hasOwnProperty(cs.items[i].id)) {
                i = filteredcount;
              }
            }          
            data = cs.items[i];
            var user = {
              id: nextid++, //unique id. tweet in stream will get id="t<id>"
              userid: data.idStr,
              screenname: data.screenName,
              name: data.screenName.toLowerCase()
            };
            //feed filter index
            cs.filter.items.push(user);
            cs.filter.users[user.name] = user;
            cs.filter.itemids[user.userid] = user.id;            
            filteredcount++;
            i++;
          }
                                                                                                    _D('F:parseitems','I:items parsed!');
        }
        this.poll('parsestream');    //always trigger parsestream, new items are already cached before they are displayed 
        break;
    }
    return true;
  }; //parseitems()
  
  Tweetfilter.prototype.cs = function() {
    try {
      var cs = twttr.app.currentPage()._instance.streamManager.getCurrent();
      if (cs.items) {
        return cs;
      }
      this.stream.status = 'notloaded';
      return false;
    } catch(e) {
      this.stream.status = 'notloaded';
      return false;
    }
  };
  
  //main function picking up items from html stream and performing DOM-Operations on tweets
  Tweetfilter.prototype.parsestream = function() {
    if (this.options['expand-new'] && $('#new-tweets-bar').length) {
      $('#new-tweets-bar').trigger('click');
      return true;
    }
    var cs = this.cs();
    if (this.stream.itemtype !== 'tweet' && this.stream.itemtype !== 'user') {
      return true; //stop polling this function, not a tweet/user stream
    }
    if (!cs.hasOwnProperty('filter')) { //first parse items in cache!
      this.poll('parseitems');
      return true;
    }
                                                                                                    _D('F:parsestream', 'fired', cs.$node, this.stream);
    var items = $('> div.stream-items > div.stream-item:not([id])', cs.$node);                      //parse stream only once, distribute ids
    if (items.length) {
      var item, itemid, id, i, imax, tweet, user, li, reparseitems = false;
      switch(cs.streamItemType) {
        case 'tweet':
          for (i=0, imax=items.length, item; i<imax && (item=items.eq(i)); i++) {
            itemid = item.attr('data-item-id');
            if (itemid.indexOf(':')) {
              itemid = itemid.split(':')[0];
            }
            if (cs.filter.itemids.hasOwnProperty(itemid)) {
              id = cs.filter.itemids[itemid];
              tweet = cs.filter.items[id];
              $('> div.stream-item-content', item.attr('id', 't'+id)).attr('id', 'i'+id);
              var tweettext = $('div.tweet-text', item);
              var htmltext = tweettext.html();
              if (htmltext.indexOf("\n") > -1) {
                tweettext.html(htmltext.replace(/\n/g, ' <br />')); //insert line breaks
              }
              tweet.ismedia = $("span.icons span.media", item).length > 0;
              if (tweet.ismedia) {
                li = ~~cs.filter.links.indexOf(tweet.id);
                if (li > -1) {
                  tweet.haslinks = false; //treat media separately as if it had no links
                  cs.filter.links.splice(li, 1);
                }
                cs.filter.media.push(tweet.id);
              }
              $('span.tweet-full-name', item).after('<i class="tfu u'+tweet.userid+'"></i>');
              if (tweet.rt && tweet.rt.userid) {
                $('span.retweet-icon', item).next('em').after('<i class="tfu u'+tweet.rt.userid+'"></i><span class="tf-via">via '+tweet.rt.via+'</span>');
              }
              $('span.tweet-actions', item)
                .after('<span class="tf-actions"><a class="tf dm" data-user="'+tweet.screenname+'" title="Direct message"><span><i class="tf-icon"></i> <b>DM</b></span></a>'+
                        '<a class="tf quote" title="Quoted Retweet"><span><i class="tf-icon"></i> <b>Quote</b></span></a>'+
                        '<a class="tf menu" title="Tweetfilter"><span><i class="tf-icon"></i> <b>Filter</b></span></a></span>')
                .before('<span class="tf-usertime" title="'+tweet.localtime.timezone+'">'+tweet.localtime.time+'</span> <span class="tf-via">via '+tweet.via+'</span>');
                                                                                                    _D('F:parsestream', 'I:itemid', itemid, 'found, id:',id);
            } else {
                                                                                                    _D('F:parsestream', 'W:itemid not found in filtered:',itemid);
              reparseitems = true;      
            }
              
          }
          break;
        case 'user':
          for (i=0, imax=items.length, item; i<imax && (item=items.eq(i)); i++) {
            itemid = item.attr('data-item-id');
            if (cs.filter.itemids.hasOwnProperty(itemid)) {
              id = cs.filter.itemids[itemid];
              user = cs.filter.items[id];
              $('> div.stream-item-content', item.attr('id', 't'+id)).attr('id', 'i'+id);
              $('span.full-name', item).after('<i class="tfu u'+user.userid+'"></i>');
                                                                                                     _D('F:parsestream', 'I:itemid', itemid, 'found, id:',id);
            } else {
              reparseitems = true;
                                                                                                    _D('F:parsestream', 'W:itemid not found in filtered:',itemid);
            }
          }
          break;
      }
      if (reparseitems) { //some items were not parsed, trigger a reparse
        this.poll('parseitems');
      }
      this.poll('refreshcss', ['filter', 'friends']);
      this.poll('parselinks');      
    }
    return true;
  };
  
  Tweetfilter.prototype.refreshfriends = function() {
                                                                                                    var f=_F('refreshfriends');
    if (this.friendstatus.disabled) return true;
    if (this.friendstatus.expires < (new Date().getTime())) {
      if (!this.friendstatus.fetching) {
        this.friendstatus = {
          expires: 0,
          uids: {},
          fetching: 'friendIds',
          nextcursor: '-1',
          currentcursor : '0'
        };
                                                                                                    _D(f, 'first fetch ', this.friendstatus.fetching);
      } else {
                                                                                                    _D(f, 'next fetch ', this.friendstatus.fetching, ':', this.friendstatus.nextcursor);
      }  
      if (this.friendstatus.nextcursor !== '0' && this.friendstatus.currentcursor !== this.friendstatus.nextcursor) {
        this.friendstatus.currentcursor = this.friendstatus.nextcursor;        
        var that = this;
        var currentuser = twttr.currentUser;
        var peoplecount = currentuser.followersCount + currentuser.friendsCount;
        //<debug>
        //currentuser = twttr.API.User.find(this.user.name);  //by setting a different name in refreshuser() pretend to be someone else, for debug
        //peoplecount = 600001;
        //</debug>
        if (this.friendstatus.fetching === 'friendIds' && this.friendstatus.currentcursor === '-1' && !this.friendstatus.expires) {
          if (peoplecount > 600000) {
            this.showmessage('You have too many relationships to fetch and store,<br>option <b>show friend status</b> has been disabled.', {resident:true});
            this.friendstatus.disabled = true;
          } else if (peoplecount > 42000 && !this.friendstatus.expires) { //only show on first load
            this.showmessage('Tweetfilter is fetching '+peoplecount+' relationships,<br> you can use <b>show friend status</b> very soon...');
          }
        }
        currentuser[this.friendstatus.fetching]({
          cursor: this.friendstatus.nextcursor,
          success: function(ids, cursor) {
                                                                                                    _D(f, 'evaluating:', that.friendstatus.fetching, ', got',ids.length,'results');
            that.friendstatus.nextcursor = cursor.response.next_cursor_str;
            switch(that.friendstatus.fetching) { //we first fetch followingids (friendids), then followerids
              case 'friendIds': //first fetch, just set
                for (var r=0,rmax=ids.length,friendid;r<rmax && (friendid=ids[r]);r++) {
                  that.friendstatus.uids[friendid] = 1; //following
                }
                break;
              case 'followerIds': //second fetch: consider following status for mutual friend status
                for (var o=0,omax=ids.length,followerid;o<omax && (followerid=ids[o]);o++) {
                  if (!that.friendstatus.uids[followerid]) {
                    that.friendstatus.uids[followerid] = 2; //follower
                  } else {
                    that.friendstatus.uids[followerid] = 4; //mutual friend
                  }
                }
                break;
            }
            if (that.friendstatus.nextcursor !== '0') { //0 = no more to fetch
                                                                                                    _D(f, 'polling next:', that.friendstatus.fetching, that.friendstatus.nextcursor);
              that.poll('refreshfriends');
            } else if (that.friendstatus.fetching === 'friendIds') { //finished fetching friendids, now fetch followers
              that.friendstatus.fetching = 'followerIds';
              that.friendstatus.nextcursor = '-1';
              that.friendstatus.currentcursor = '0';
                                                                                                    _D(f, 'switched cursor to:', that.friendstatus.fetching, that.friendstatus.nextcursor, ', now polling');
              that.poll('refreshfriends');
            } else { //finished fetching friendids and followerids
              if (peoplecount > 42000 && !that.friendstatus.expires) {
                that.showmessage('Tweetfilter finished fetching '+peoplecount+' relationships,<br> you can now use <b>show friends</b>.');
              }
              var h;
              if (peoplecount > 250000) { // 50-120 API calls (!), refresh only every 12h
                h = 12;            
              } else if (peoplecount > 100000) {  //20-49 API calls, refresh every 4h
                h = 4;
              } else { //refresh every 1h
                h = 1;
              }
              
              that.friendstatus.expires = (new Date().getTime())+(h*60*60*1000);
                                                                                                    _D(f, 'finished fetching.', that.friendstatus);
              that.friendstatus.fetching = false;
              that.friendstatus.currentcursor = '0';
              that.savefriends();
              that.refreshoptions();
              that.poll('refreshcss', ['friends']);
            }
          }
        });
      }
    }
    return true; //don't repoll after api call, let the "success" callback repoll
  };
  
  Tweetfilter.prototype.findexactmatch = function(haystack, needle) { //find exact match without using regex
    var pos = haystack.indexOf(needle), hlen=haystack.length, nlen=needle.length;
    while (pos > -1) {
      if ((pos === 0 || this.stopchars.indexOf(haystack.charAt(pos-1)) > -1) && //if it's at the beginning or preceded by a stopchar
          (pos+nlen === hlen || this.stopchars.indexOf(haystack.charAt(pos+nlen)) > -1)) { //and at the end or followed by a stopchar
        return true;
      }
      pos = haystack.indexOf(needle, pos+1);
    }
    return false;
  };
  
  //check tweet for any match or a specific search object 
  Tweetfilter.prototype.checktweet = function(tweet, search) {
                                                                                                    var f=_F('checktweet');
     var cs = this.cs(), query, ismatch;
     if (cs && this.streamready()) {
      var searches = [];
      if (typeof search !== 'undefined') {
        searches = [search];
      } else {
        tweet.matches = [];
        searches = this.queries;
      }
                                                                                                    _D(f, 'checking tweet', tweet, 'searches', searches);
      for (var s=0, smax=searches.length; s < smax; s++) {
        query=searches[s];
        ismatch = false;
        //simple text filter: regular, exact and simple match (=contains keyword) allowed
        if (query.simple) {
          if (query.regular) {
            ismatch = query.regex.test(tweet.text);
                                                                                                    _D(f, 'check for regular match:', query.rx, 'in', tweet.text, ':', ismatch)
          } else 
          if (query.exact) {
            ismatch = this.findexactmatch(tweet.text, query.search);
                                                                                                    _D(f, 'check for exact match:', query.search, 'in', tweet.text, ':', ismatch)
          } else {
            ismatch = tweet.text.indexOf(query.search) > -1;
                                                                                                    _D(f, 'check for simple match:', query.search, 'in', tweet.text, ':', ismatch)
          }
        } else 
        //user filter: regular and simple (lowercase) match allowed
        if (query.user) {
          if (query.regular) {
            ismatch = query.regex.test(tweet.username) || (tweet.rt && query.regex.test(tweet.rt.username))
                                                                                                    _D(f, 'check for regular user match:', query.rx, 'in', tweet.username, ':', ismatch)
          } else {
            ismatch = (tweet.username === query.search) || (tweet.rt && tweet.rt.username === query.search);
                                                                                                    _D(f, 'check for user match:', query.search, '==', tweet.username, tweet.rt ? tweet.rt.username : '', ':', ismatch)
          }
        } else 
        //source filter: regular, exact and simple match (=contains keyword) allowed
        if (query.source) {
          if (query.regular) {
            ismatch = query.regex.test(tweet.source) || (tweet.rt && tweet.rt.source && query.regex.test(tweet.rt.source)); //checking source of OP and RT-user
                                                                                                    _D(f, 'check for regular source match:', query.rx, 'in', tweet.source, tweet.rt ? tweet.rt.source : '', ':', ismatch)
          } else 
          if (query.exact) {
            ismatch = this.findexactmatch(tweet.source, query.search) || (tweet.rt && tweet.rt.source && this.findexactmatch(tweet.rt.source, query.search));
                                                                                                    _D(f, 'check for exact source match:', query.search, 'in', tweet.source, tweet.rt ? tweet.rt.source : '', ':', ismatch)
          }else {
            ismatch = tweet.source.indexOf(query.search) > -1 || (tweet.rt && tweet.rt.source && tweet.rt.source.indexOf(query.search) > -1);
                                                                                                    _D(f, 'check for source match:', query.search, 'in', tweet.source, tweet.rt ? tweet.rt.source : '', ':', ismatch)
          }
        } else 
        //name filter: regular, exact and simple match (=contains keyword) allowed
        if (query.name) {
          if (query.regular) {
            ismatch = query.regex.test(tweet.name); //do not filter here the retweeting user's real name. it's visible nowhere, would be irritating
                                                                                                    _D(f, 'check for regular name match:', query.rx, 'in', tweet.name, ':', ismatch)
          } else 
          if (query.exact) {
            ismatch = this.findexactmatch(tweet.name, query.search);
                                                                                                    _D(f, 'check for exact name match:', query.search, '=', tweet.name, ':', ismatch)
          } else {
            ismatch = tweet.name.toString().indexOf(query.search) !== -1;
                                                                                                    _D(f, 'check for simple name match:', query.search, 'in', tweet.name, ':', tweet.name.indexOf(query.search), ismatch)
          }
        }
        if (ismatch && !~tweet.matches.indexOf(query.id)) {
          if (!cs.filter.matches.hasOwnProperty(query.index)) {
            cs.filter.matches[query.index] = [tweet.id];
          } else if (!~cs.filter.matches[query.index].indexOf(tweet.id)) {
            cs.filter.matches[query.index].push(tweet.id);
          }
                                                                                                    _D(f, 'I:pushing match', query.id, '=', query.index, 'on tweet', tweet.id);
          tweet.matches.push(query.id);
        }        
      }
    } else _D(f, 'W:stream is not ready!');
  };
  
  Tweetfilter.prototype.refreshfiltercss = function(instantly) {
    if (typeof instantly === 'undefined') instantly = false;
                                                                                                    _D('F:refreshfiltercss', 'refreshing filter css');
    if (!instantly) {
      this.poll('refreshcss', ['filter']);
    } else {
      this.refreshcss(['filter']);
    }
  };
  
  Tweetfilter.prototype.addquery = function(query, enabled) {
    if (this.status.settingsloaded && this.options['filter-disabled']) {
      return false;
    }
    if (typeof enabled != 'boolean') {
      enabled = true;
    }
    var search = {
      id: this.nextid++,            //unique id
      index: query.toLowerCase(),   //lowercase query
      raw: query,                   //raw, case-sensitive query. <-- saved in localStorage
      search: query.toLowerCase(),  //what to (really) search for
      label: query,                  //label shown in ui, case sensitive
      sortby: query,                //value used for sorting
      type: '',
      count: 0,                     //match count in current stream
      enabled: enabled,             //status <-- saved in localStorage
      excluded: query.indexOf('-') === 0              //exclude the query from filter
    }
    var types = {
      user:    /^\-?(?:f(?:rom)?\:\s*@?|@@)([A-Za-z0-9\_]{1,15}|(?:.+\=)?\/.+\/)$/, // from: @tweetfilterjs or from:tweetfilterjs or f:tweetfilterjs or @@tweetfilterjs (short syntax)
      source:  /^\-?(?:v(?:ia)?\:\s*|\:@)(.+)$/, // via: echophon or via:web or v:iphone or :@sometwitterbot (short syntax)
      name:    /^\-?(?:by?\:\s*|\?@)(.+)$/, // by: john doe or ?@john doe  (short syntax)
      exact:   /^\-?"(.+)"$/, //case-insensitive exact phrase surrounded by stopchars like space or period (this.stopchars)
      simple:  /^\-?'?(.+)/ //anything else is simple text search/exclude or regex (within text and within expanded links text), trim leading escape character (single quote)
    }
    var matches, regularmatch, exactmatch;
    for (var type in types) {
      matches = search.raw.match(types[type]);
      if (matches) {
        regularmatch = exactmatch = false; //extended syntax, e.g. via:/^(iphone|android)$/  or name:"Joanna" or @/^bot
        search.label = matches[1]; //preserve case for labels and regular expressions
        search.search = search.sortby = matches[1].toLowerCase(); //always do case insensitive search / sort
        search.type = type;
        //normalize all inputs with different syntaxes
        switch(type) {
          case 'exact':
            search.label = '»'+search.label+'«';
            search.index = search.raw.toLowerCase();
            search.exact = search.simple = true;
          break;
          case 'simple':
            search.simple = true;
            search.raw = matches[0];
            search.index = search.raw.toLowerCase();
            if (search.raw[0] !== "'" && (regularmatch = search.label.match(/^(?:(.+)\=)?\/(.+)\/$/))) { //regular text match <-- /(something|matching)/
              search.label = (typeof regularmatch[1] != 'undefined' ? regularmatch[1] : '/'+regularmatch[2]+'/i');
              search.search = search.rx = regularmatch[2];
              search.sortby = (typeof regularmatch[1] != 'undefined' ? regularmatch[1] : regularmatch[2]);
            } else {
              search.label = matches[1];
              search.search = search.sortby = matches[1].toLowerCase(); //always do case insensitive search / sort
            }
          break;
          case 'user': //match tweets by user. this filter is always "exact"
            search.user = true;
            search.index = (search.excluded ? '-' : '')+'from:@'+search.search;
            search.raw = (search.excluded ? '-' : '')+'from:@'+search.label;
            if (/^[A-Za-z0-9\_]{1,15}$/.test(search.label)) {
              search.label = '@'+search.label;
            } else if ((regularmatch = search.label.match(/^(?:(.+)\=)?\/(.+)\/$/))) {
              search.label = '@'+(typeof regularmatch[1] != 'undefined' ? regularmatch[1] : '/'+regularmatch[2]+'/i');
              search.search = search.rx = regularmatch[2];
              search.sortby = (typeof regularmatch[1] != 'undefined' ? regularmatch[1] : regularmatch[2]);
            }
          break;
          case 'source': //match tweets by source (via)
            search.source = true;
            search.index = (search.excluded ? '-' : '')+'via:'+search.search;
            search.raw = (search.excluded ? '-' : '')+'via:'+search.label;
            if ((exactmatch = search.search.match(/^"(.+)"$/))) { //exact (=full word) source match <-- via:"web"
              search.label = 'via »'+exactmatch[1]+'«';
              search.exact = true;
            } else if ((regularmatch = search.label.match(/^(?:(.+)\=)?\/(.+)\/$/))) {
              search.label = 'via '+ (typeof regularmatch[1] != 'undefined' ? regularmatch[1] : '/'+regularmatch[2]+'/i');
              search.search = search.rx = regularmatch[2];
              search.sortby = (typeof regularmatch[1] != 'undefined' ? regularmatch[1] : regularmatch[2]);
            } else {
              search.label = 'via '+search.label;
            }
          break;
          case 'name': //match tweets by (real?)name of user
            search.name = true;
            search.index = 'by:'+search.search;
            search.raw = 'by:'+search.label;
            if ((exactmatch = search.search.match(/^"(.+)"$/))) { //exact (=full word) name match <-- by:"John Doe"
              search.label = 'by »'+exactmatch[1]+'«';
              search.exact = true;
            } else if ((regularmatch = search.label.match(/^(?:(.+)\=)?\/(.+)\/$/))) { //regular name match <-- by:The Doe's=/(jane|john)\sdoe/
              search.label = 'by '+ (typeof regularmatch[1] != 'undefined' ? regularmatch[1] : '/'+regularmatch[2]+'/i');
              search.search = search.rx = regularmatch[2];
              search.sortby = (typeof regularmatch[1] != 'undefined' ? regularmatch[1] : regularmatch[2]);
            } else {
              search.label = 'by '+search.label;
            }
          break;
        }
        if (search.rx) { 
          try {
            search.regex = new RegExp(search.rx, 'im'); //case insensitive, multiline
            search.regular = true;
          } catch(e) {
            this.showmessage('This regular expression is invalid.<br />If you did not intend to use regular<br /> expressions prefix your filter with \' (single quote).');
            return false;
          }
        }
        break;
      }
    }
    for (var i=0, q; q=this.queries[i]; i++) {
      if (q.index === search.index) {
        return q.id; //already in filters/exclusions: return query index
      }
    }
    this.queries.push(search);
    this.queries.sort(function(a, b) { //sort the filter list
      return ((a.sortby < b.sortby) ? -1 : ((a.sortby > b.sortby) ? 1 : 0));
    });
    if (this.status.initialized) {
      this.savesettings();
      var cs = this.cs();
      if (this.streamready()) {
        if (cs.hasOwnProperty('filter')) {
          cs.filter.matches[search.index] = [];
          for (var t in cs.filter.items) {
            this.checktweet(cs.filter.items[t], search);
          }
          if (enabled && cs.filter.matches[search.index].length) {
            this.refreshfiltercss();
          }
        }
      }
      this.poll('refreshfilterlist');
    }
    return search.id;
  };

  Tweetfilter.prototype.setquerystatus = function(queryid, status) { //status: true/false: toggle, -1: delete, -2: toggle exclusive filter
    if (this.options['filter-disabled']) {
      return;
    }
    var exclusivemode = this.exclusive.length > 0, q;
                                                                                                    _D('F:setquerystatus', 'set query', queryid, 'to status', status);
    for (var i=0,len=this.queries.length;i<len;i++) {
      if (this.queries[i].id === +queryid) {
        switch(status) {
          case -1: //delete from filter
                                                                                                    _D('F:setquerystatus', 'query', this.queries[i].id, 'at index', ~~this.exclusive.indexOf(this.queries[i].id));
            if (exclusivemode && ~this.exclusive.indexOf(this.queries[i].id)) { //deleting an exclusive filter
              this.setexclusive(this.queries[i].id); //remove from exclusive
            }
            this.queries.splice(i, 1);
            this.savesettings();
            this.refreshfilterlist();
            this.refreshfiltercss();
            this.setstreamtitle();
            break;
          case -2: //set as exclusive filter
            this.setexclusive(this.queries[i].id);
            this.poll('setstreamtitle');
            this.refreshfiltercss();
            break;
          default: //enable or disable query temporarily
            if (this.queries[i].enabled != status) {
              this.queries[i].enabled = status;
              this.savesettings();
              this.poll('refreshfilterlist');
              this.refreshfiltercss();
            }
            break;
        }
        break;
      }
    }
  };
  
  Tweetfilter.prototype.showmessage = function(text, options) {
                                                                                                    var f=_F('showmessage');
                                                                                                    _D(f, text, options);
    if (typeof options === 'undefined') {
      options = {resident: false, timeout: 4200};
    } else if (options === true) {
      options = {resident: true};
    } 
    if (!options.resident && !options.timeout) {
      options.timeout = 4200;
    }
                                                                                                    _D(f, 'added default options, now', options);
    var $md = $('#message-drawer'), $message;
    var $msg = $('>div.message', $md);
    if (!$msg.length) {
      $msg = $('<div class="message message">'+
                  '<div class="message-inside"></div>'+
                '</div>');
      $md.append($msg);
    }
    if (options.type) {
      $message = $('span.'+options.type, $md);
      if (!$message.length) {
        $message = $('<span class="tf '+options.type+'">'+text+'</span>');
      } 
      var oldvalue, value;
      for (var v in options.vars) {
        value = options.vars[v];
        if (v.indexOf('+')===0) {
          v = v.substr(1);
          oldvalue = $message.attr('data-'+v);
          if (oldvalue) {
            value += +oldvalue;
          }
        }
        $message.attr('data-'+v, value);
        text = text.split('{{'+v+'}}').join(value);
      }
      $message.html(text);
    } else {
      $message = $('<span class="tf">'+text+'</span>');
    }
    $('div.message-inside', $md).append($message);
    var hidemessage = function() {
      var target = $('span.tf:not(:animated)', $md).length > 1 ? $message : $msg;
      target.css("opacity", 1).animate({
       opacity: 0
      }, 500, function () {
       target.remove();
      });
    };
    if (options.resident) { //resident: add close button
      if (!$('a.x', $message).length) {
        var closebutton = $('<a href="#" class="x">\u00d7</a>');
        closebutton.bind('click', hidemessage);
        $message.append(closebutton);
      }
    } else { //not resident: hide after timeout
      if (this.timeids.hidemessage) {
        if (this.timeids.hidemessage[options.type] !== -1) {
          clearTimeout([this.timeids.hidemessage[options.type], this.timeids.hidemessage[options.type]=-1][0]);
        }
      } else {
        this.timeids.hidemessage = {};
        this.timeids.hidemessage[options.type] = -1; 
      }
      var timeoutid = setTimeout(hidemessage, options.timeout);
      if (options.type) {
        this.timeids['hidemessage'][options.type] = timeoutid;
      }
    } 
  };

  Tweetfilter.prototype.checkreceived = function() {
    if (this.options['alert-message'] || this.options['alert-sound-message'] || this.options['alert-mention'] || this.options['alert-sound-mention']) {
      var that = this;
      if (this.options['alert-message'] || this.options['alert-sound-message']) {
        twttr.currentUser.receivedMessages({
          since_id: this.status.messagesinceid ? this.status.messagesinceid : -1,
          cacheOptions: {skipOverwrite:false},
          success: function(data, result) {
            if (result.response.length) {
              if (that.status.messagesinceid <= 0) {
                that.status.messagesinceid = result.response[0].id;
                                                                                                    _D('F:checkreceived', 'sinceid:'+that.status.messagesinceid);
                return;
              }
              that.status.messagesinceid = result.response[0].id;
              var howmany = result.response.length;
              if (that.options['alert-message']) that.showmessage('You have {{count}} new <a href="/#!/messages">messages</a>!', {resident: true, type: 'newmessages', vars: {'+count': howmany}});
              if (that.options['alert-sound-message']) that.playsound();
              that.savesettings();
            } else if (that.status.messagesinceid === -1) { //user has 0 messages received
              that.status.messagesinceid = 0;
            }
          }
        });
      }
      if (this.options['alert-mention'] || this.options['alert-sound-mention']) {
        twttr.currentUser.mentions({
          since_id: this.status.mentionsinceid ? this.status.mentionsinceid : -1,
          success: function(data, result) {
            if (result.response.length) {
              if (that.status.mentionsinceid <= 0) { 
                that.status.mentionsinceid = result.response[0].id;
                                                                                                    _D('F:checkreceived', 'W:first fetch, not alerting.', 'new sinceid:'+that.status.mentionsinceid);
                return;
              }
              that.status.mentionsinceid = result.response[0].id;
              var howmany = result.response.length;
              if (that.options['alert-mention']) that.showmessage('You have {{count}} new <a href="/#!/mentions">mentions</a>!', {resident: true, type: 'newmentions', vars: {'+count': howmany}});
              if (that.options['alert-sound-mention']) that.playsound();
              that.savesettings();
            } else if (that.status.mentionsinceid === -1) { //user has 0 messages received
              that.status.mentionsinceid = 0;
            }
          }
        });
      }
      if (!this.timeids.checkreceived || this.timeids.checkreceived === -1) {
        this.timeids.checkreceived = window.setInterval(twttr.bind(this, function(e) {
          this.poll('checkreceived');
        }), 60000);
      }
    } else {
      if (this.timeids.checkreceived !== -1) {
        window.clearInterval([this.timeids.checkreceived, this.timeids.checkreceived=-1][0]);
      }
    }
    return true;
  };


  Tweetfilter.prototype.playsound = function() {
    if (Modernizr.audio) {
      if (!document.getElementById('tweetfilter-notify')) {
        var sound;
        if (Modernizr.audio.ogg) {
          sound = new Audio("data:audio/ogg;base64,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");
        } else if (Modernizr.audio.mp3) {
          sound = new Audio("data:audio/mpeg;base64,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IHgBQZmAlqQUChJXU5VuIuSzlrruw7TdqymMxmW0p0FQVDX5YO1iIGrH/////////9P3a9GhOioJAf///////6vfq//t+nNJ//MYxB8DkAWcAgAAAC3H//////7f///33dCbtlCQP/////////MYxCcEOAGcDAAAAP/7km997Sff9VUOP///////8VV6/7r3//MYxC0DuAGgAgAAAvEn41X/R6/bu9XRxl3/7P////1+n0qH//MYxDUECAWcBAAAAE/////+R///+9Who+vH//////////1V//MYxDsEEAGgCgAAAllttOxFNUf+//////8t/f/6uv521y0M//MYxEEEaAWUAAAAAD////////R9jErqb6FK4D/////////8//MYxEYDgAGYAgAAAIxYuogZf2u9FQyB/////////p0LuRyc//MYxE8D2AWgAgAAAqnv9KoOP////////pp/r2Wd7eyzRRY///MYxFYD8AWYAgAAAP///3Wf+5mpjPd/9n7kUACwD/////////MYxF0DmAGgCgAAAv9utm6/rGIVh//////////o3VJn+63///MYxGUEWAWkBAAAAP///o/6P///b//8jeA/////////+vo6//MYxGoESAWcDAAAAPpVD////////9Vmj////+7+pQw///////MYxG8EKAWgCgAAAv//9Pby3eqZ6cf/////////rKUbTtrE//MYxHUEOAWYCgAAAGQ10A4///////o/2XP/9FbvZWqqCQH///MYxHsD+AGkFAAAAP//9n///1ZWz/9orWdrXnRtoD////////MYxIICqAGgAgAAAv////X/+VFFTEFNRTMuOTguNFVVVVVV//MYxI4D6AWUAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//MYxJUDEAWoBAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//MYxJ8D4AGYCAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//MYxKYDgAWcCgAAAlVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//MYxK8EOAGcAgAAAlVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//MYxLUEMAGcCgAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//MYxLsE6AGUDAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//MYxL4DYAVgBAAAAlVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV");
        } else return;
        sound.id = 'tweetfilter-notify';
        sound.controls = false;
        sound.loop = false;
        sound.autoplay = false;
        sound.setAttribute('style', 'position:absolute; left:-1000px; top:-100px;')
        document.body.appendChild(sound);
      }
      document.getElementById('tweetfilter-notify').play();
    }
  };

  Tweetfilter.prototype.tweetclicklink = function(e) {
                                                                                                    var f=_F('tweetclicklink');
                                                                                                    _D(f, 'opening link in new tab', e.target);
    var target = this.options['expand-link-targets'] && e.target.getAttribute('data-longurl') ?
      e.target.getAttribute('data-longurl') : e.target.getAttribute('href');
    if (target.indexOf('://')===-1) {  //workaround for twitter behaviour cutting off protocol from link
      target = 'http://'+target;
    }
                                                                                                    _D(f, 'I:using current target:', target);
    window.open(target);
    return false;
  };
  
  Tweetfilter.prototype.tweetclickhashtag = function(e) {
                                                                                                    var f=_F('tweetclickhashtag');
    var target = e.currentTarget.getAttribute('href');
                                                                                                    _D(f, 'routing to target',e, target);
    if (this.options['search-realtime']) {
      target = target.replace(/\/search\?q=/, '/search/realtime/');
                                                                                                    _D(f, 'fixed target:', target);
    }
    twttr.router.routeTo(target);
    return false;
  };
  
  Tweetfilter.prototype.savedsearchclick = function(e) {
                                                                                                    var f=_F('savedsearchclick');
                                                                                                    _D(f, 'setting decider feature to ',+!this.options['search-realtime']);
    twttr.decider._features.phoenix_search_relevance = +!this.options['search-realtime'];
    return true;
  };
  
    
  
  Tweetfilter.prototype.tweetclickvia = function(e) {
                                                                                                    _D('F:tweetclickvia', 'opening link in new tab');
    window.open(e.target.getAttribute('href'));
    return false;
  };
  
  Tweetfilter.prototype.tweetclick = function() {
    if (this.timeids.resizepane && this.timeids.resizepane === -1) {
      window.clearTimeout([this.timeids.resizepane, this.timeids.resizepane=-1][0]);
    }
    this.timeids.resizepane = setTimeout(twttr.bind(this, function() {
      $(window).trigger('tf.resizepane');
      this.timeids.resizepane = -1;
    }), 500);
    return true; //always bubble
  };

  Tweetfilter.prototype.getselection = function() {
    var selection = window.getSelection();
    return selection ? selection.toString().replace(/<\S[^><]*>/g, '').replace(/\r?\n+/g, ' ') : false;
  };
  
  Tweetfilter.prototype.removeselection = function() { 
    window.getSelection().removeAllRanges(); 
    return true;
  };
  
  Tweetfilter.prototype.tweettextmouseup = function(e) {
                                                                                                    var f=_F('tweettextmouseup');
                                                                                                     _D(f, e);
    if (this.options['add-selection'] && !this.options['filter-disabled'] && $(e.target).closest('div.stream-item').length) {
      if (window.getSelection().toString().length || e.which === 2) {
                                                                                                     _D(f, 'I:found selection!');
        e.stopImmediatePropagation();
        return false;
      } else _D(f, 'W:no selection');
    }
    return true;
  };
  
  Tweetfilter.prototype.tweettextmousedown = function(e) {
                                                                                                    var f=_F('tweettextmousedown');
                                                                                                    _D(f, e);
    if (e.which <3) {
      if (this.options['add-selection'] && !this.options['filter-disabled'] && $(e.target).closest('div.stream-item').length) {
        var selected;
        if ((selected = this.getselection())) {
                                                                                                    _D(f, 'adding new query', ((e.which === 2 || e.shiftKey) ? '-' : '') + selected);
          var queryid = this.addquery((e.which === 2 || e.shiftKey ? "-'" : "'") + selected, true, (e.which === 2 || e.shiftKey));
          if (queryid && e.ctrlKey) {
            this.setexclusive(queryid);
            this.poll('refreshfilterlist');            
            this.poll('setstreamtitle');
            this.refreshfiltercss();
          }                   
          this.poll('removeselection');
          e.stopImmediatePropagation();
          return false;
        } else _D(f, 'W:no selection');
      }
    }
    return true;
  };

  Tweetfilter.prototype.filtermenuleave = function(e) {
                                                                                                    _D('F:filtermenuleave');
    var target = $(e.target).is('ul.tf-menu') ? $(e.target) : $(e.target).parents('ul.tf-menu');
    if (target.length) target.remove();
  };
  
  Tweetfilter.prototype.tweetmousedown = function() {
    if (this.timeids.resizepane && this.timeids.resizepane === -1) {
      window.clearTimeout([this.timeids.resizepane, this.timeids.resizepane=-1][0]);
    }
    this.timeids.resizepane = setTimeout(twttr.bind(this, function() {
      $(window).trigger('tf.resizepane');
      this.timeids.resizepane = -1;
    }), 500);
    return true; //always bubble
  };
  
  Tweetfilter.prototype.tweetactionsclick = function(e) {
    switch(e.type) {
      case 'mousedown':
        if (e.which !== 1) return true; 
        e.stopImmediatePropagation();
        var streamitem = $(e.target).closest('div.stream-item'), that=this;
        var itemid = streamitem.attr('data-item-id');
        if (itemid) {
          if (itemid.indexOf(':')) {
            itemid = itemid.split(':')[0];
          }
          var cs = this.cs();
          if (cs.filter.itemids.hasOwnProperty(itemid)) {
            var item = cs.filter.items[cs.filter.itemids[itemid]];
                                                                                                    _D('F:filter_actions_mousedown', 'item found', item);
          } else {
                                                                                                    _D('F:filter_actions_mousedown', 'W:item', itemid, 'not found in cache!');
            return false;
          }

          switch(e.currentTarget.className.substr(3)) {
            case 'dm':
              twttr.API.User.find(item.screenname, function(user) {
                var imageurl = user.profileImageUrl;
                twttr.currentUser.relationshipWith(item.screenname, function(relation) {
                  if (relation.canDM) {
                    if (!relation.following) {
                      that.showmessage('You do not follow @'+item.screenname+',<br /> the user will not be able to answer directly.');
                    }
                    twttr.dialogs.dmSingle({
                      user: {
                        screenName: item.screenname,
                        user_id: item.userid,
                        name: item.name,
                        profile_image_url: imageurl
                      },
                      origin: "Tweetfilter "+this.version
                    }).open();
                  } else {
                    if (!relation.followedBy) {
                      that.showmessage('@'+item.screenname+' does not follow you.');
                    } else { //fallback
                      that.showmessage('You can\'t send direct messages to @'+item.screenname);
                    }
                  }
                });
              });
              break;
            case 'quote':
              var tweettext = false;
              for (var i=0,imax=cs.items.length;i<imax;i++) {
                if (cs.items[i].id === itemid) {
                  tweettext = this.decodehtml(cs.items[i].text);
                  break;
                }
              }
              if (tweettext) {
                new twttr.widget.TweetDialog({
                  modal: false,
                  draggable: true,
                  defaultContent: "RT @"+item.screenname+": "+tweettext,
                  template: {
                    title: _("Retweet "+item.screenname)
                  },
                  origin: "Tweetfilter "+this.version
                }).open().focus();        
              } else _D('F:filter_actions_mousedown', 'W:item', itemid, 'not found in items cache!');

              break;
            case 'menu':
              $('ul.tf-menu', cs.$node).remove();
                                                                                                    _D('filter_menu_mousedown');
              $(e.target).closest('div').prepend(this.tweetfiltergetmenu(streamitem, cs.filter.itemids[itemid]));
              e.stopImmediatePropagation();
              break;
            case 'add':
                                                                                                    _D('F:filter_actions_mousedown', 'add to filter', e.target);
              if (e.which <3) {
                var queryid = this.addquery((e.which === 2 || e.shiftKey ? '-' : '') + e.target.getAttribute('data-query'), true, e.which === 2 || e.ctrlKey );
                if (queryid && e.ctrlKey) {
                  this.setexclusive(queryid);
                  this.poll('refreshfilterlist');            
                  this.poll('setstreamtitle');
                  this.poll('removeselection');
                  this.refreshfiltercss();
                }
                $('ul.tf-menu').remove();
                e.stopImmediatePropagation();
                var tab = $('a[data-tab='+(e.shiftKey ? 'exclusions' : 'filters')+']', this.widget);
                if (!tab.closest('li').hasClass('active')) {
                  tab.trigger('click');
                }
                return false;
              }
              return true;
              break;
          }
        }
        break;
    }
    return false;
  };

  Tweetfilter.prototype.tweetfiltergetmenu = function(item, id) {
                                                                                                    _D('F:tweetfiltergetmenu', item, id);
    var menu = '<ul class="tf-menu drop-down">';
    var username = $.trim($('a.tweet-screen-name', item).html());
    menu += '<li class="tf-user"><a class="tf add" data-query="@@'+username+'" title="filter tweets from @'+username+'">@'+username+'</a></li>';
    var retweetuser = $('span.retweet-icon', item).next('em').html();
    if (retweetuser) {
      retweetuser = $.trim(retweetuser.split(' ')[1]);
      menu += '<li class="tf-user"><a class="tf add" data-query="@@'+retweetuser+'" title="filter tweets from @'+retweetuser+'">@'+retweetuser+'</a></li>';
    }
    var sources = [];
    $('span.tf-via', item).each(function() {
      var source = $(this).html().substr(4);
      if (source) {
        source = $.trim(source.replace(/<\S[^><]*>/g, ''));
        if (!~sources.indexOf(source)) {
          menu += '<li class="tf-source"><a class="tf add" data-query="via:'+source+'" title="filter tweets via '+source+'">via '+source+'</a></li>';
          sources.push(source);
        }
      }
    })
    var mentions = [];
    var hashtags = [];
    var domains = [];
    var linksmenu = '';
    var hashtagsmenu = '';
    var mentionsmenu = '';
    var links = $('div.tweet-text > a[class]', item);
    if (links.length) {
      for (var l=0, lmax=links.length, link; l<lmax && (link=links.eq(l)); l++) {
        var linkclass = link.attr('class').replace(/^\s+/,'');
        if (linkclass.indexOf(' ') > -1) linkclass = linkclass.split(' ')[0];
        switch(linkclass) {
          case 'twitter-hashtag':
            var hashtag = link.text();
            if (hashtag && !~hashtags.indexOf(hashtag.toLowerCase())) {
              hashtagsmenu += '<li class="tf-hashtag"><a class="tf add" data-query="'+hashtag+'" title="filter tweets tagged '+hashtag+'">'+hashtag+'</a></li>';
              hashtags.push(hashtag.toLowerCase());
            }
            break;
          case 'twitter-atreply':
            var mention = link.attr('data-screen-name');
            if (mention && !~mentions.indexOf(mention)) {
              mentionsmenu += '<li class="tf-mention"><a class="tf add" data-query="@'+mention+'" title="filter tweets mentioning @'+mention+'">@'+mention+'</a></li>';
              mentions.push(mention);
            }
            break;
          case 'twitter-timeline-link':
            var linkaddress = link.attr('data-expanded-url');
            if (!linkaddress) linkaddress = link.attr('title');
            if (!linkaddress) linkaddress = link.attr('href');
            if (linkaddress) {
              var domain = linkaddress.match(/^[a-z]+\:\/\/(?:www\.)?([^\/]+)/);
              if (domain && !~domains.indexOf(domain[1])) {
                domain = domain[1];
                linksmenu += '<li class="tf-domain"><a class="tf add" data-query="'+domain+'" title="filter tweets linking to '+domain+'">'+domain+'</a></li>';
                domains.push(domain);
              }
            }
            break;
        }
      }
    }
    return menu+mentionsmenu+hashtagsmenu+linksmenu+'</ul>';
  };
  
  
  //twitter api resolved shortened urls
  Tweetfilter.prototype.twttrajaxevent = function(event, request, settings) {
    if (settings.url.indexOf('urls/resolve') > -1 || settings.url.indexOf('/related_results/') > -1) { //resolved urls or opened tweet details pane for first time
      if (this.timeids.parselinks && this.timeids.parselinks !== -1) {
        window.clearTimeout([this.timeids.parselinks, this.timeids.parselinks=-1][0]);
        this.timeids.parselinks = -1;
      }
      this.timeids.parselinks = window.setTimeout(twttr.bind(this, function() {
        this.poll('parselinks');
        this.timeids.parselinks = -1;
      }), this.heartbeat * 4);
    } else if (settings.url.indexOf('/trends/') > -1 || settings.url.indexOf('/recommendations') || settings.url.indexOf('/promos/')) { //fetched trends, who to follow, ad
      if (this.timeids.findcomponents && this.timeids.findcomponents !== -1) {
        window.clearTimeout([this.timeids.findcomponents, this.timeids.findcomponents=-1][0]);
      }
      this.timeids.findcomponents = window.setTimeout(twttr.bind(this, function() {
        this.poll('findcomponents');
        this.timeids.findcomponents = -1;
      }), this.heartbeat * 4);
    }
  };

  //walk through links, expand or collapse
  Tweetfilter.prototype.parselinks = function() {
                                                                                                    var f=_F('parselinks');
    try {
      if (this.status.initialized && this.stream.status === 'ready') {
        var cs = twttr.app.currentPage()._instance.streamManager.getCurrent();
      } else {
                                                                                                    _D(f, 'W:not ready. initialized:', this.status.initialized, ', stream status:', this.stream.status);
        return false;
      }
    } catch(e) {
                                                                                                    _D(f, 'W:not ready, failed to get current stream');
      return false;
    }
    var showexpanded = this.options['expand-links'];
    var links = $('div.stream-item[id] a.twitter-timeline-link[title]', cs.$node), shownurl, shorturl, expandedurl, titleurl, checktweets=[];
                                                                                                    _D(f, 'Found', links.length, 'links on page.');
    walklinks: for (var l=0,llen=links.length,link;l<llen && (link=links.eq(l));l++) {
                                                                                                    _D(f, 'processing link', link.get(0));
      if (!link.is('[data-shorturl]')) {
        shorturl = link.attr('href');
        link.attr('data-shorturl', shorturl);
      } else shorturl = link.attr('data-shorturl');
      shownurl = link.html().replace(/<\S[^><]*>/g, ''); //currently visible url shown in tweet, clean html from searches
      expandedurl = link.attr('data-longurl') || ''; //if set, its the last expanded link
      titleurl = link.attr('title').replace(/\.([a-zA-Z0-9]{2,4})\/$/, '.$1').replace(/\\\?/, '?'); //this is always the latest expanded link. funny twitter adds a slash to EVERY expanded url, we cut it off if extension found (.html, .php etc)
      if ((!showexpanded && shownurl !== shorturl) || (showexpanded && shownurl !== titleurl)) { //multiple shortened links
        if (titleurl.indexOf('#') === -1) { //try to detect if link expander chopped off the hash
          if (shownurl.indexOf('#') > -1) { //shown url has a hash, but expanded hasn't
            titleurl = shownurl;
          } else if (expandedurl.indexOf('#') > -1) { //(last) expanded url has a hash, but titleurl hasn't
            titleurl = expandedurl;
          }
          
        }
        if (showexpanded) {
          link.html(titleurl);
        } else {
          link.html(shorturl);
        }
      }
                                                                                                    _D(f, (expandedurl != titleurl ? 'W:': 'D:')+'expandedurl:', expandedurl, 'shownurl', shownurl, 'titleurl:', titleurl);
      if (expandedurl != titleurl) { //has link been expanded since last run
        var itemid, id = -1;
        var item = link.closest('div.stream-item');
        if (item.length) {
          if (cs && cs.hasOwnProperty('filter') && this.streamready()) {
            if (item.attr('id')) {
              id = +item.attr('id').substr(1);
              itemid = cs.filter.items[id].tweetid;
            } else {
              itemid = item.attr('data-item-id');
              if (!itemid) {
                                                                                                    _D(f, 'E:id and itemid not found!', item);
                return false;
              }
              if (itemid.indexOf(':')) {
                itemid = itemid.split(':')[0];
              }
              id = cs.filter.itemids[itemid]; 
            }
                                                                                                    _D(f, 'tweet id:', id);
            link.attr('data-longurl', titleurl);
            if (id > -1) {
                                                                                                    _D(f, 'searching tweet in filter index:', itemid);
              
              cs.filter.items[id].text += "\n"+titleurl.toLowerCase();
                                                                                                    _D(f, 'I:added link to text:', cs.filter.items[id].text);
                                                                                                    _D(f, 'I:checking tweet:', cs.filter.items[id]);
              if (!~checktweets.indexOf(id)) {
                checktweets.push(id);
              }
            } else {
                                                                                                    _D(f, 'W:tweet not found in cache:', itemid);
            }
          } else {
                                                                                                    _D(f, 'W:stream is not ready');
            return false;
          }
        }                                                                                           else _D(f, 'W:stream item not found!');
      }
    }
                                                                                                    _D(f, 'check tweets', checktweets);
    if (checktweets.length) {
      for (var c=0,cmax=checktweets.length;c<cmax;c++) {
        this.checktweet(cs.filter.items[checktweets[c]]);
      }
      this.refreshfiltercss();
    }                                                                                                
    return true;
  };
  
  //create widget's dashboard component
  Tweetfilter.prototype.createwishboard = function(target) {
    this.wishboard = $([
      '<div id="tf-wishboard" class="component tf wishboard">',
        '<div id="tf-compact-activities">',
          '<div class="dashboard-profile-annotations clearfix">',
            '<h2 class="dashboard-profile-title">',
            '</h2>',
          '</div>',
          '<div class="tf-activities">',
            '<ul class="user-stats clearfix"></ul>',
            '<hr class="component-spacer" />',
          '</div>',
        '</div>',
      '</div>'
    ].join("\n"));
    target.before(this.wishboard);
    this.refreshactivities();
  };
  
  Tweetfilter.prototype.refreshactivities = function() {
    var that = this;
    twttr.currentUser.update(function(user) {
      var activities = $('#tf-compact-activities');
      $('.tf-activities > ul', activities).html(
        [ '<li><a href="/#!/'+user.screenName+'" class="user-stats-count">'+user.statusesCount+'<span class="user-stats-stat">'+_('Tweets')+'</span></a></li>'+
          '<li><a href="/#!/'+user.screenName+'/favorites" class="user-stats-count">'+user.favouritesCount+'<span class="user-stats-stat">'+_('Favorites')+'</span></a></li>'+
          '<li><a href="/#!/'+user.screenName+'/following" class="user-stats-count">'+user.friendsCount+'<span class="user-stats-stat">'+_('Following')+'</span></a></li>'+
          '<li><a href="/#!/'+user.screenName+'/followers" class="user-stats-count">'+user.followersCount+'<span class="user-stats-stat">'+_('Followers')+'</span></a></li>'+
          '<li><a href="/#!/'+user.screenName+'/lists/memberships" class="user-stats-count">'+user.listedCount+'<span class="user-stats-stat">'+_('Listed')+'</span></a></li>'
        ].join("\n")
      );
      $('h2.dashboard-profile-title', activities).html(
        '<img width="24" class="profile-dashboard" alt="'+that.encodehtml(user.name)+'" src="'+user.profileImageUrl+'">'+
        '@'+user.screenName
      );
    });    
    return true; //method can be used in poll
  };
  
  //create the widget and bind events, triggers loadsettings
  Tweetfilter.prototype.createwidget = function() {
                                                                                                    _D('F:createwidget', 'entering function, widget:', this.widget);
    if (!this.widget) {
                                                                                                    _D('F:createwidget', 'I:creating widget');
      this.widget = $([
        '<div id="tf" style="display:none">',
          '<div class="tf-header">',
            '<div id="tf-stream-nav">',
               '<a class="top" title="to the top" href="#" onclick="window.scrollTo(0,0); return false;"><i></i><b></b></a>'+
               '<a class="layout" data-option="filter-minimized" title="toggle Tweetfilter layout"><i class="tf-icon"></i></a>'+
               '<a class="bottom" title="to the bottom" href="#"><i></i><b></b></a>'+
            '</div>',
            '<ul class="tf-filters">',
              '<li class="passed">',
                '<a data-option="filter-inverted" title="show passed Tweets">',
                  '<i>Passed</i>',
                  '<b><span id="tf-count-passed">0</span></b>',
                '</a>',
              '</li>',
              '<li class="invert">',
                '<a data-option="filter-inverted" title="show filtered Tweets">',
                  '<i>Filtered</i>',
                  '<b><span id="tf-count-filtered">0</span></b>',
                '</a>',
              '</li>',
              '<li class="logo">',
                '<a class="tf-logo" data-option="filter-minimized" title="toggle Tweetfilter layout"></a>',
              '</li>',
              '<li class="filter">',
                '<a data-option="filter-links" title="filter Tweets with links">',
                  '<i>Links</i>',
                  '<b id="tf-count-links">0</b>',
                '</a>',
              '</li>',
              '<li class="filter">',
                '<a data-option="filter-media" title="filter all media">',
                  '<i>Media</i>',
                  '<b id="tf-count-media">0</b>',
                '</a>',
              '</li>',
              '<li class="filter">',
                '<a data-option="filter-retweets" title="filter all Retweets">',
                  '<i>Retweets</i>',
                  '<b id="tf-count-retweet">0</b>',
                '</a>',
              '</li>',
              '<li class="filter">',
                '<a data-option="filter-replies" title="filter all replies">',
                  '<i>Replies</i>',
                  '<b id="tf-count-replies">0</b>',
                '</a>',
              '</li>',
            '</ul>',
          '</div>',
          '<div class="tf-stream">',
            '<ul class="checks">',
              '<li class="streamtitle"><span id="tf-stream-title"></span></li>',
              '<li class="disable"><a data-option="filter-disabled" title="show all Tweets"><b></b>disable filter</a></li>',
            '</ul>',
          '</div>',
          '<ul class="tf-tabs">',
            '<li class="addtofilter">',
              '<input type="text" id="tf-filter-add" value="+ Add to Tweetfilter" />',
              '<a href="http://tweetfilter.org/#usage" target="blank" title="Tweetfilter usage (tweetfilter.org)">Help</a>',
            '</li>',
            '<li class="tf-tab active">',
              '<a data-tab="filters">Filters</a>',
            '</li>',
            '<li class="tf-tab">',
              '<a data-tab="exclusions">Exclusions</a>',
            '</li>',
          '</ul>',
          '<div data-tab="filters">',
            '<div id="tf-scroll">',
              '<ul id="tf-filters" class="checks tf-queries">',
              '</ul>',
            '</div>',
          '</div>',
          '<div data-tab="exclusions">',
            '<div id="tf-scroll">',
              '<ul id="tf-exclusions" class="checks tf-queries">',
              '</ul>',
            '</div>',
          '</div>',
          '<div id="tf-customize">',
            '<ul class="tf-tabs">',
              '<li class="tf-tab active">',
                '<a data-tab="filter">Filter</a>',
              '</li>',
              '<li class="tf-tab">',
                '<a data-tab="timeline">Timeline</a>',
              '</li>',
              '<li class="tf-tab">',
                '<a data-tab="dashboard">Dashboard</a>',
              '</li>',
              '<li class="tf-tab">',
                '<a data-tab="layout">Layout</a>',
              '</li>',
              '<li class="tf-tab">',
                '<a data-tab="notify">Notify</a>',
              '</li>',
              '<li class="tf-tab">',
                '<a data-tab="more">More</a>',
              '</li>',
            '</ul>',
            '<div data-tab="filter" class="active">',
              '<ul class="checks">',
                '<li><a data-option="skip-mentionsme" class="filter" title="do not filter Tweets mentioning me"><b></b>skip mentioning me</a></li>',
                '<li><a data-option="skip-me" class="filter" title="do not filter Tweets written by me"><b></b>skip my posts</a></li>',
                '<li><a data-option="add-selection" class="filter" title="add selected text to filter after click"><b></b>add selection to filter</a></li>',
                '<li><a data-option="hide-promoted-tweets" title="always hide promoted tweets"><b></b>hide promoted Tweets</a></li>',
                '<li><a data-option="highlight-mentionsme" title="highlight Tweets mentioning me"><b></b>highlight mentioning me</a></li>',
                '<li><a data-option="highlight-me" title="highlight Tweets I wrote"><b></b>highlight my Tweets</a></li>',
                '<li><a data-option="highlight-excluded" title="highlight Tweets matching Exclusions"><b></b>highlight excluded</a></li>',
              '</ul>',
            '</div>',
            '<div data-tab="timeline">',
              '<ul class="checks">',
                '<li><a data-option="show-friends" title="show who follows you / who you follow"><b></b>show friend status</a></li>',
                '<li><a data-option="show-via" title="show tweet source"><b></b>show via in Tweets</a></li>',
                '<li><a data-option="show-br" title="show line breaks in Tweets"><b></b>show line breaks</a></li>',
                '<li><a data-option="show-usertime" title="show local Tweet creation time"><b></b>show Tweet\'s local time</a></li>',
                '<li><a data-option="expand-new" title="immediately show new Tweets"><b></b>expand new Tweets</a></li>',
                '<li><a data-option="expand-links" title="expand shortened links in Tweets"><b></b>expand links</a></li>',
                '<li><a data-option="small-links" title="smaller link size"><b></b>small links</a></li>',
              '</ul>',
            '</div>',
            '<div data-tab="dashboard">',
              '<ul class="checks">',
                '<li><a data-option="fixed-dashboard"><b></b>fixed dashboard</a></li>',
                '<li class="disabled"><a data-option="compact-activities"><b></b>compact activities</a></li>',
                '<li class="disabled"><a data-option="hide-wtf"><b></b>hide who to follow</a></li>',
                '<li class="disabled"><a data-option="hide-trends"><b></b>hide trends</a></li>',
                '<li class="disabled"><a data-option="hide-ad"><b></b>hide advertising</a></li>',
                '<li><a data-option="hide-promoted-content" title="hide promoted trends, who to follow"><b></b>hide promoted content</a></li>',
                '<li><a data-option="hide-invite"><b></b>hide invite friends</a></li>',
                '<li class="disabled"><a data-option="minify-menu"><b></b>minify menu</a></li>',
              '</ul>',
            '</div>',
            '<div data-tab="layout">',
              '<ul class="checks">',
                '<li><a data-option="hide-topbar"><b></b>auto-hide top bar</a></li>',
                '<li><a data-option="hide-question"><b></b>hide question</a></li>',
                '<li><a data-option="hide-tweetbox"><b></b>hide main tweet box</a></li>',
              '</ul>',
            '</div>',
            '<div data-tab="notify">',
              '<ul class="checks">',
                '<li><a data-option="alert-message" title="alert when received new direct messages"><b></b>alert new dm</a></li>',
                '<li><a data-option="alert-sound-message" title="play sound when received new direct messages"><b></b>sound on new dm</a></li>',
                '<li><a data-option="alert-mention" title="alert when received new mentions"><b></b>alert new mentions</a></li>',
                '<li><a data-option="alert-sound-mention" title="play sound when received new mentions"><b></b>sound on new mentions</a></li>',
              '</ul>',
            '</div>',
            '<div data-tab="more">',
              '<ul class="checks">',
                '<li><a data-option="clear-stream-cache" title="always reload the timeline after page switch (which is faster on some browsers)"><b></b>disable timeline cache</a></li>',
                '<li><a data-option="tweets-fill-page" title="always try to load Tweets until page is full"><b></b>fill page with Tweets</a></li>',
                '<li><a data-option="expand-link-targets" title="change link targets pointing to expanded url"><b></b>expanded link targets</a></li>',
                '<li><a title="drag to your favorites bar" id="tf-export-settings">Tweetfilter settings</a></li>',
                '<li><a data-option="search-realtime" title="default all searches (top, hashtag, saved) to show &quot;all tweets&quot;"><b></b>default search to "all"</a></li>',
              '</ul>',
              '<div class="about">',
                '<ul>',
                  '<li class="version">Tweetfilter '+this.version+' <span>11-08-08</span></li>',
                  '<li class="website"><a href="http://tweetfilter.org" target="_blank">Visit website</a></li>',
                  '<li class="follow"><a href="#">Follow @tweetfilterjs</a></li>',
                  '<li class="support"><a href="#" target="_blank">Show \u2665</a></li>',
                '</ul>',
              '</div>',
              '<div class="support">',
                '<p>Thanks for supporting Tweetfilter!</p>',
              '</div>',
            '</div>',
          '</div>',
        '</div>'
        ].join("\n")
      );
      $('#page-outer').append(this.widget);
      var that = this;
      //set input field active on focus, catch enter
      $('#tf input[type=text]').live('focus', function() {
        var input = $(this);
        if (!input.hasClass('active')) {
          input.addClass('active').attr('data-idlevalue', input.val()).val('');
        }
      })
      //set filter input inactive on blur, set idle text if empty
      .live('blur', function() {
        var input = $(this);
        if (!input.val()) {
          input.removeClass('active').val(input.attr('data-idlevalue'));
        }
      });
      //override twitters hotkey feature for the filter input
      this.widget.delegate('input', 'keydown keypress keyup', function(e) {
        if (e.type === 'keydown' && e.which === 13) {
          /* add query to filter by pressing enter */
          var queryid, query=$('#tf-filter-add').val();
          if (e.shiftKey && query[0] !== '-') { //add exclude with shift+enter
            query = '-'+query;
          }
          if ((queryid = that.addquery(query))) {
            $('#tf-filter-add').val('').focus();
                                                                                                    _D('F:addtofilterinput', e, queryid, $('#tf-filter-add').val());
            var tab = $('a[data-tab='+(query[0] === '-' ? 'exclusions' : 'filters')+']', that.widget); //set active tab excluded or filtered
            if (!tab.closest('li').hasClass('active')) {
              tab.trigger('click');
            }
            if (e.ctrlKey || that.exclusive.length > 0) { //set as exclusive filter immediately with ctrl+enter
              that.setquerystatus(queryid, -2);
              that.poll('refreshfilterlist');            
            }
          }
        }
        e.stopPropagation();
      })
      //click an option
      .delegate('a[data-option]', 'mousedown', function(e) {
        var sender = $(this), sendersparent=sender.closest('li');
        var optionname = sender.attr('data-option');
        if ((!sender.hasClass('disabled') && !sendersparent.hasClass('disabled')) || (that.exclusive.length && optionname === 'filter-inverted')) {
          switch(e.which) {
            case 1:
              if (!e.ctrlKey) {
                var status = !sender.hasClass('checked');
                if (optionname === 'filter-inverted') {
                  status = sendersparent.hasClass('invert');
                }
                that.setoption(optionname, status, true);
                $('a[data-option="'+optionname+'"]', that.widget).toggleClass('checked', that.options[optionname]);
                if (optionname === 'filter-inverted') {
                  $('.passed a[data-option="'+optionname+'"]', that.widget).toggleClass('checked', !that.options[optionname]);
                }
                break;
              }
              //fall through
            case 2:
              var exclusiveoption;
              if (optionname.substr(0,6)=='filter' && (exclusiveoption=optionname.substr(7)) &&
                  ~['replies','retweets','media','links'].indexOf(exclusiveoption)) 
              {
                that.setexclusive(exclusiveoption);
                sender.toggleClass('exclusive');
                that.poll('refreshfilterlist');            
                that.poll('setstreamtitle');            
                that.refreshfiltercss();
              } 
              break;
          }
        }
        e.stopImmediatePropagation();
        return false;
      })
      //delete a query from the list clicking 'x'
      .delegate('a.x', 'click', function(e) {
        var queryid = +$(this).prev().attr('data-queryid');
        if (queryid) {
          that.setquerystatus(queryid, -1);
        }
        return false;
      })
      //toggle a query 
      .delegate('a[data-queryid]', 'mousedown', function(e) {
        switch(e.which) {
          case 1:
            if (e.shiftKey) { //edit query with ctrl+x(click)
              var queryid = $(this).attr('data-queryid')*1;
              for (var i=0,imax=that.queries.length,query;i<imax && (query=that.queries[i]);i++) {
                if (query.id === queryid) {
                  $('#tf-filter-add').val(query.raw).toggleClass('active', true).focus();
                  return false;
                }
              }
              return false;
            } else if (!e.ctrlKey) { 
              that.setquerystatus($(this).attr('data-queryid')*1, !$(this).hasClass('checked'));
              break;
            }
            //fall through
          case 2: //mouse wheel click or ctrl+click on query sets exclusive filters overriding all other options
            $(e.target).closest('li').toggleClass('exclusive');
            that.setquerystatus($(this).attr('data-queryid')*1, -2);
            break;
          default:
            return true;
          break;
        }
        return false;
      })
      //click an option tab
      .delegate('a[data-tab]', 'click', function() {
        var tab = $(this).attr('data-tab');
        var li = $(this).parent();
        var target=$('div[data-tab='+tab+"]", this.widget);
        if (target.length) {
          if (li.hasClass('active')) {
            target.removeClass('active');
            li.removeClass('active');
          } else {
            target.siblings('div[data-tab]').removeClass('active').end().addClass('active');
            li.siblings('li').removeClass('active').end().addClass('active');
          }
          $(window).trigger('tf.resizepane');
        }
      })
      .delegate('a.bottom', 'click', function() {
        try {
          var h = document.documentElement.scrollHeight - document.documentElement.clientHeight; 
          window.scrollTo(0, h); 
          twttr.app.currentPage()._instance.streamManager.getCurrent().getMoreOldItems();
        } catch(e) {}
        return false;
      }).delegate('#tf-export-settings', 'mouseenter', function() {
        var settings = that.getvalue(':TWEETFILTER:', {})[that.user.id];
        delete settings['relationships'];
        settings.messagesinceid = settings.mentionsinceid = -1;
        $('#tf-export-settings').attr('href', "javascript:(function() { twtfilter.loadsettings("+JSON.stringify(settings)+"); })();");    
        return false;
      }).delegate('#tf-export-settings', 'click', function() {
        return false;
      }).delegate('li.support > a', 'click', function() {
        new twttr.widget.TweetDialog({
          modal: false,
          draggable: true,
          defaultContent: "Tweetfilter \u2665 browser extension for #newtwitter: http://tweetfilter.org",
          template: {
            title: _("Thank you! :)")
          },
          origin: "Tweetfilter "+that.version
        }).open().focus();        
      }).delegate('li.follow > a', 'click', function() {
        twttr.currentUser.isFollowing('tweetfilterjs', function(isfollowing) {
          if (!isfollowing) {
            var tweetfilterjs = twttr.API.User.find('tweetfilterjs');
            tweetfilterjs.follow({
              success: function() {
                that.showmessage('Thanks for following!')
              },
              error: function (e) { //redirect if following through api failed
                window.location.hash = '#!/tweetfilterjs';
              }
            })
          } else {
            that.showmessage('You are already following @tweetfilterjs.<br />See <a href="http://tweetfilter.org" target="_blank">tweetfilter.org</a> if you missed any updates.', {resident:true});
          }
        })
      });
      //set initial active tab
      $('.active a[data-tab]', this.widget).each(function() {
        $('div[data-tab="'+$(this).attr('data-tab')+'"]').toggleClass('active', true);
      });
    }
  };
  
  Tweetfilter.prototype.setexclusive = function(queryid) {
    var queryfound = false;
    if (typeof queryid === 'number') {
      for (var q=0,len=this.queries.length;q<len;q++) {
        if (this.queries[q].id === queryid) {
          queryfound = true;
          break;
        }
      }
      if (!queryfound) return;
    }
    var exclusivemode = this.exclusive.length > 0;
    var i = exclusivemode ? ~~this.exclusive.indexOf(queryid) : -1;
    if (i === -1) {
      if (typeof queryid === 'number') {
        this.exclusive.push(queryid);
        if (!this.queries[q].enabled) {
          this.queries[q].wasdisabled = true;
          this.queries[q].enabled = true;
          this.poll('refreshfilterlist');
        }
      } else {
        this.exclusive.unshift(queryid);
      }     
      if (!exclusivemode) { //entering exclusivemode
        this.refreshoptions();
        window.scrollTo(0,0); //needed if you scrolled down many pages
      }
    } else {
      this.exclusive.splice(i, 1);
      if (typeof queryid === 'number') {
        if (this.queries[q].enabled && this.queries[q].wasdisabled) {
          this.queries[q].enabled = this.queries[q].wasdisabled = false;
          this.poll('refreshfilterlist');
        }
      }
      if (!this.exclusive.length) { //exiting exclusivemode
        this.refreshoptions();
      }
    }
    this.setstreamtitle();
  };
  
  //refresh widget filter check list
  Tweetfilter.prototype.refreshfilterlist = function() {
    if (!this.widget) return true; 
                                                                                                    _D('F:refreshfilterlist');
    var query;
    var listitems = {
      exclusions: [],
      filters: []
    };
    var category;
    var exclusivemode = this.exclusive.length > 0;
    for (var i=0,len=this.queries.length; i<len; i++) {
      query = this.queries[i];
      category = query.excluded ? 'exclusions' : 'filters';
      var action = '';
      if (!this.options['filter-inverted']) {
        action = query.enabled ? 'show' : 'hide';
      } else {
        action = query.enabled ? 'hide' : 'show';
      }
      action = action + ' tweets';
      switch(query.type) {
        case 'user':action += ' from';break;
        case 'source':action += ' via';break;
        default:action += ' containing';break;
      }
      listitems[category].push('<li class="'+query.type+(!query.count ? ' notfound' : '')+(exclusivemode && ~this.exclusive.indexOf(query.id) ? ' exclusive' : '')+'">'+
         '<span>'+
           '<a data-queryid="'+query.id+'"'+(query.enabled ? ' class="checked"' : '')+' title="'+this.encodehtml(query.index)+'">'+
             '<b></b><span>'+this.encodehtml(query.label)+'</span>'+
             '<i id="tf-count-'+query.id+'">'+(query.count ? query.count : '--')+'</i>'+
           '</a>'+
           '<a class="x" title="remove from filter">\u00d7</a>'+
         '</span>'+
        '</li>');
    }
    for (category in listitems) {
      if (listitems[category].length) {
        $('#tf-'+category).html(listitems[category].join("\n")).parent().show();
      } else {
        $('#tf-'+category).empty().parent().hide();
      }
    }
    $(window).trigger('tf.resizepane');
    return true; //don't requeue in poll
  };


  //set style element contents
  Tweetfilter.prototype.setcss = function(id, styles) {
                                                                                                    _D('F:setcss', id);
    $('style#tf-'+id).html(styles);
  };
  
  Tweetfilter.prototype.css3gradient = function(startcolor, endcolor, vertical) {
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
  };
  
  Tweetfilter.prototype.css3shadow = function(blur, color, hoffset, voffset) {
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
  };
  
  Tweetfilter.prototype.css3rounded = function(radius) {
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
  };
  
  Tweetfilter.prototype.refreshindex = function() {
    var cs;
    if ((cs = this.cs())) {
      if (cs.streamItemType !== 'tweet') {
        return true;
      }
      if (!cs.hasOwnProperty('filter')) {
        this.poll('parseitems');
        return true; 
      }
      var matchcount, targetcounter, exclusivemode = this.exclusive.length > 0, hidden = [], excluded = [];
      if (!exclusivemode) {
         /* filter all retweets */
        if (this.getoption('filter-retweets') && this.stream.namespace != 'RetweetsByOthers' && this.stream.namespace != 'RetweetsByYou' && cs.filter.retweets.length) {
          hidden = hidden.concat(cs.filter.retweets);
        }
        if (this.getoption('filter-replies') && cs.filter.replies.length) {
          hidden = hidden.concat(cs.filter.replies);
        }
        if (this.getoption('filter-links') && !(this.stream.params.hasOwnProperty('mode') && this.stream.params.mode==='links') && cs.filter.links.length) {
          hidden = hidden.concat(cs.filter.links);
        }
        /* filter all media */
        if (this.getoption('filter-media') && cs.filter.media.length) {
          hidden = hidden.concat(cs.filter.media);
        }
      } else {
        if (~this.exclusive.indexOf('retweets') && cs.filter.retweets.length) {
          hidden = hidden.concat(cs.filter.retweets);
        }
        if (~this.exclusive.indexOf('replies') && cs.filter.replies.length) {
          hidden = hidden.concat(cs.filter.replies);
        }
        if (~this.exclusive.indexOf('links') && cs.filter.links.length) {
          hidden = hidden.concat(cs.filter.links);
        }
        if (~this.exclusive.indexOf('media') && cs.filter.media.length) {
          hidden = hidden.concat(cs.filter.media);
        }
      }
      for (var q=0, query, qmax=this.queries.length; q<qmax && (query=this.queries[q]); q++) {
        matchcount = 0;
        if (query.user && !query.regular && cs.filter.users.hasOwnProperty(query.search) && (matchcount=cs.filter.users[query.search].length) && matchcount) { //user filter: count tweets by this user
          if (query.enabled && query.excluded && !exclusivemode) { //excluded do not count in exclusivemode
            excluded = excluded.concat(cs.filter.users[query.search]);
          } else if (query.enabled && (!exclusivemode || ~this.exclusive.indexOf(query.id))) {
            hidden = hidden.concat(cs.filter.users[query.search]);
          }
          query.count = matchcount;
        } else if (cs.filter.matches.hasOwnProperty(query.index) && (matchcount=cs.filter.matches[query.index].length) && matchcount) { //count tweets with match
          if (query.enabled && query.excluded && !exclusivemode) {
            excluded = excluded.concat(cs.filter.matches[query.index]);
          } else if (query.enabled && (!exclusivemode || ~this.exclusive.indexOf(query.id))) {
            hidden = hidden.concat(cs.filter.matches[query.index]);
          }
          query.count = matchcount;
        } else {
          query.count = 0;
        }
        targetcounter = $('#tf-count-'+query.id);
        targetcounter.html(query.count);
        targetcounter.parents('li').toggleClass('notfound', !query.count); 
      }

      cs.filter.excluded = excluded;
      cs.filter.hidden = hidden;
      cs.filter.passed = this.arraydiff(cs.filter.tweets, hidden);
      
    }
    return true;
  };
  
  //build css from filter settings, filters and/or options and set it
  Tweetfilter.prototype.refreshcss = function(which) { 
                                                                                                    _D('F:refreshcss', which);
    var style = [];
    var name;
    var cs = this.cs();
    for (var i in which) {
      style = [];
      name = which[i];
      switch(name) {
        case 'filter': //anything that hides/shows tweets
          if (this.options['filter-disabled'] || !this.streamready() || this.stream.itemtype !== 'tweet') {
            style.push('.tf-actions > a.tf.menu { display:none !important; }'); //hide the "add to filter" dropdown in stream while disabled
                                                                                                    _D('F:refreshcss', 'W:suspending filter. stream itemtype: ', this.stream.itemtype, ', mode:', this.stream.mode, ', filter disabled:', this.options['filter-disabled']);
            this.setcss(name, style.join("\n"));
          }
          if (!cs.hasOwnProperty('filter')) {
            this.poll('parseitems');
            this.poll('refreshindex');
            return true; 
          }
          if (!this.colors) {
            this.refreshcolors();
          }
          if (this.streamready() && this.stream.itemtype === 'tweet') {
            if (!this.options['filter-disabled']) { //only if not disabled: refresh filter index, hide/show tweets
              this.refreshindex();
              var exclusivemode = this.exclusive.length > 0;
              var hidecss = 'display:none;';
              var showcss = 'display:block;';
              var inverted = this.options['filter-inverted'];
              var tweetsvisible = 0;
              //.stream-tabs .stream-tab
              if (exclusivemode) {
                 style.push('div.stream-items > div.stream-item { '+hidecss+'}'); //hide all tweets
                 style.push('#t'+cs.filter.hidden.join(',#t')+' { '+(showcss)+'}');
                 tweetsvisible = cs.filter.hidden.length;
              } else {
                if (inverted) {
                  style.push('div.stream-items > div.stream-item { '+hidecss+'}'); //hide all tweets
                  //inverted: show only hidden
                  if (cs.filter.hidden.length) {
                    style.push('#t'+cs.filter.hidden.join(',#t')+' { '+showcss+'}');
                    tweetsvisible = cs.filter.hidden.length;
                  }
                } else {
                  //show only passed, excluded
                  style.push('div.stream-items > div.stream-item { '+hidecss+'}'); //hide all tweets
                  if (cs.filter.passed.length) {
                    style.push('#t'+cs.filter.passed.join(',#t')+' { '+showcss+'}');
                    tweetsvisible = cs.filter.passed.length;
                  }
                  if (cs.filter.excluded.length) {
                    style.push('#t'+cs.filter.excluded.join(',#t')+' { '+showcss+' }');
                    tweetsvisible += cs.filter.excluded.length;
                  }
                  if (this.getoption('skip-me') && cs.filter.me.length) {
                    style.push('#t'+cs.filter.me.join(',#t')+' { '+showcss+' }');
                    tweetsvisible += cs.filter.me.length;
                  }
                  if (this.getoption('skip-mentionsme') && cs.filter.mentionsme.length) {
                    style.push('#t'+cs.filter.mentionsme.join(',#t')+' { '+showcss+' }');
                    tweetsvisible += cs.filter.mentionsme.length;
                  }
                }
              }
              /* highlight excluded tweets */
              if (this.options['highlight-excluded'] && cs.filter.excluded.length) { //highlight tweets matching a filter exclusion
                style.push('#t'+cs.filter.excluded.join(',#t') + ' { '+this.css3gradient(twttr.helpers.hexToRGBA(this.colors.excluded, '0.4'), '#FFFFFF')+' }'); //gradient
              }
              if (this.options['hide-promoted-tweets'] && cs.filter.promoted.length) {
                style.push('#t'+cs.filter.promoted.join(',#t')+' { '+hidecss+' }');
              }
            }
            /* highlight replies to me (overwrites excludes, if colliding) */
            if (this.options['highlight-mentionsme'] && this.stream.namespace !== 'Mentions' && cs.filter.mentionsme.length) { //highlight tweets mentionining current user
              style.push('#t'+cs.filter.mentionsme.join(',#t') + ' { '+this.css3gradient(twttr.helpers.hexToRGBA(this.colors.reply, '0.4'), '#FFFFFF')+' }'); //gradient
            }
            /* highlight own tweets */
            if (this.options['highlight-me'] && this.stream.namespace!=='YourTweetsRetweeted' && !(this.stream.namespace === 'User' && 
                this.stream.params.screenName.toLowerCase() === this.user.name) && cs.filter.me.length) 
            { //highlight tweets written by current user
              style.push('#t'+cs.filter.me.join(',#t') + ' { '+this.css3gradient(twttr.helpers.hexToRGBA(this.colors.me, '0.4'), '#FFFFFF')+' }'); //gradient
            }
          }
          this.setcss(name, style.join("\n"));
          if (this.streamready() && this.stream.itemtype === 'tweet' && !this.options['filter-disabled']) {
            $('body').toggleClass('tf-filter-inverted', inverted);
            $('#tf-count-items').html(cs.filter.items.length); //all tweets in timeline
            $('#tf-count-filtered').html(cs.filter.hidden.length); //filtered (hidden) tweets
            $('#tf-count-passed').html(cs.filter.passed.length); //tweets wich passed all filters
            $('#tf-count-retweet').html(cs.filter.retweets.length);
            $('#tf-count-media').html(cs.filter.media.length);
            $('#tf-count-replies').html(cs.filter.replies.length);
            $('#tf-count-links').html(cs.filter.links.length);
            if (this.options['tweets-fill-page'] && tweetsvisible < 10) {
              cs.getMoreOldItems();
            }
          } else {
            $('[id^="tf-count-"]', this.widget).html('--'); //set counters idle 
            $('.tf-queries > li', this.widget).toggleClass('notfound', true);
          }
                                                                                                    _D('F:refreshcss', 'W:refreshing filter css');
          if (!this.streamready()) {
            this.poll('refreshcss', ['filter']); //repoll 
          }
          break;
        case 'friends':
          if (!this.streamready()) {
            this.poll('refreshcss', ['friends']); //repoll
            break;
          }
          if (this.friendstatus.expires) { //is 0 at init, > 0 means it's loaded. we don't care here if it's expired, that's done in interval and refreshfriends
            if (this.getoption('show-friends')) { //show friend status icon
              var following=[], follower=[], mutual=[], css = [], userid, username, 
                  filterset = (this.stream.itemtype === 'tweet' ? cs.filter.userids : cs.filter.users);
                                                                                                    _D('F:refreshcss', 'W:refreshing friends css', this.stream);
              
                                                                                                    _D('F:refreshcss', 'I:refreshing tweet stream friend status', cs.filter.userids);
              switch(this.stream.itemtype) {
                case 'tweet':
                  for (username in filterset) {
                    userid = filterset[username];
                    switch(this.friendstatus.uids[userid]) {
                      case 1:following.push(userid);break;
                      case 2:follower.push(userid);break;
                      case 4:mutual.push(userid);break;
                    }
                  }
                  break;
                case 'user':
                  for (username in filterset) {
                    userid = filterset[username].userid;
                    switch(this.friendstatus.uids[userid]) {
                      case 1:following.push(userid);break;
                      case 2:follower.push(userid);break;
                      case 4:mutual.push(userid);break;
                    }
                  }
                  break;
              }
                                                                                                    _D('F:refreshcss', 'setting friends css', 'following:', following, 'follower:', follower, 'mutual:', mutual);
              if (following.length) css.push('i.u'+following.join(',i.u') + ' { padding-right:14px; background-position: right 3px !important; }');
              if (follower.length) css.push('i.u'+follower.join(',i.u') + ' { padding-right:14px; background-position: right -16px !important; }');
              if (mutual.length) css.push('i.u'+mutual.join(',i.u') + ' { padding-right:14px; background-position: right -35px !important; }');
              this.setcss(name, css.join("\n")); //friend status
            } else this.setcss(name, '');
          }
          break;
          
        
        case 'layout':
                                                                                                    _D('F:refreshcss', 'W:refreshing layout css');
         style = [
          'html { overflow-y:scroll; min-height:100%; }', //force scrollbar, remove horizontal jumps (opera)
          '#tf { display:block !important; bottom: 0; margin-left: 586px; position: fixed; text-align:left; '+this.css3rounded('0 4px 0 0')+' font-family:Arial,"Helvetica Neue",Helvetica,sans-serif; background:#fff; position:fixed; bottom:0; z-index:1; width: 385px; '+this.css3shadow('2px', 'rgba(0, 0, 0, 0.3)')+' border:1px solid #bbb; border-bottom:0; }',
          '#tf * { padding:0; margin:0; list-style:none; color:@darktext; }',
          //icon sprites
          ".tf-icon { background-image: url('data:image/png;base64,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') !important; }",
          ".tf-logo { width:48px; height:33px; -moz-border-radius:0 !important; -webkit-border-radius:0 !important; border-radius:0 !important; background: @link url('data:image/gif;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAhCAYAAACfiCi5AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA2RpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMC1jMDYwIDYxLjEzNDc3NywgMjAxMC8wMi8xMi0xNzozMjowMCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDo2RjFCMDk3MkM3OUFFMDExOTFGREJBRDY5RjdFM0NDQiIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDpFNTM0MTE4MDlGMTAxMUUwOEQyNUYyQUNFN0UzMkE1QiIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDpFNTM0MTE3RjlGMTAxMUUwOEQyNUYyQUNFN0UzMkE1QiIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ1M1IFdpbmRvd3MiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDo3MDFCMDk3MkM3OUFFMDExOTFGREJBRDY5RjdFM0NDQiIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDo2RjFCMDk3MkM3OUFFMDExOTFGREJBRDY5RjdFM0NDQiIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PnS9gtwAAATPSURBVHja7JhbaBRnFMe/SbKb3Wyym2Q3S5MSi/XW4gWLta22FGvBNkhflOKD+CKKL5UKQvsi+CBKL9QXsQj23jcf2lJolYI+CNJCpSCtIoSIa811L7lubptk/P/H8y3DOjuZvaAIOfBjNjPffHP+53znzDcxTJh6iq1GPeW2JGBJQIVWV+T8ELgOVoPngO8J+pgCtyXYW70KuAN2ggBYDjaCV+S4Ejzjcm8lNgruglvgbwkinU+CXU4CjCJtdBy8CHodrjWBZZKdl8A28HqZyzEBroA/xWkGbhAsOIw9Dw48ctYsbieozSNbwB+md0uBwyDicf5OMOw0kZuALHirBBHM5kkPzt8EL5Qwrx/8VmwytcjDxsCHoLGEB37rMl8GrCkxs9fcHHQVkMvl9M/b4Ch41sND4yBZZMqPPdzvA13gki2ImbIE9PX1mb29vebY2Jg5NzfHU2lwAexaZP1+4TAdRcVc7tkIPgd3Zfx1cAhEwe9lCchkMmZ3d7fZ09NjJhIJc2hoyJycnDQXFhZ4OQHOgk0OzrwM5gum+85hXFiK+YaMuQ9Oixg9JiaBczTDbTc6Pz+vkAWF6OuOpQzDUD6fTzU0NKjGxkbl9/tzuPQNOCYvHZof/CutVtsecMH2917wGYiBX8D34DKYKXDjDPigmI/GYttpRFwNDg4+HAzntRBSU1OjAoGAam5u5vEmLnWB/+XWH8A++U2n1oIe+fsTcAR8Cr6y3VNo74GfQW3ZeyFGOh6PW85j6eSF0HktcGBgQGWz2bXijJ7zhm2aezYn+Ub9COwAx12cfxf86Oa8JwFcRvX19aqjo0OFQqG8EKKzwGMqlVLoWjvEMVp3wdZkVvZUp8BhcLXII1dxDOb/dXZ2NlLuZi5vXP/9/f0qHA6rWCxmnZuamsrD6xRFocPDw8zWfgy5JNsQLk9DMkDbLnVy1r6MZZ/1DngbbJ6YmAhyLgaO2a9IACch6EgKE1tCWLyEkec5tFk1MzNjLSdE7Q0UdkD2NNMgaCtu1sg5PbXUyEEKYEYZkPHxcWseWltbm6o4A7SWlhY1PT1tRZlCRkZGLFEUwWXV1NRkRT+dTlNQe2trK3et/4CJAgFh8JMU9NcIwKucl0HgUXc7Gudmg6iKAN1p6KTuRHwgI0ZBFEGRNDqD369h3F+yPWYYB0BUWmsIXESkO5k5ZCzfnnV9IYMKQajog8YxC7W1tVb0daT0A0dHRy0xTDmXEtgs0RuR2/vACvAfnP0ymUx2Umhha6YxGNFoVNXV1VVXgJV/rH8+gM4yA+g6lhjCSOJNbUUOTq2XWzK2Lzyeex/dajcjz+7FgNBRvhgZ9WAwaC3NanxSFjU+VBcxhdjfB8wEnWtvb38ep5rFcS3kTVyznOe9DAadZ11pEdX8JlZe2ivf0PptzOhxCbFOsMxCWHJrMKyfQ1kyGL+BApkhRlnXEI88p2vosQlg1FjYLGJGlTCKkUhE18Y6iKOANJsK6mIVo85M8R5duBTPLlbt/0p4MtkD5V9orAlmgOfh/Cb5KGcHWg7BcTrOoucSYgCYCW5V9DJ87AJ0i7X3a4php0KX2QJHuYXIwumtEGbQcWaoEodL3o1WUCM5RJlLiHv+SYjoYAOothlL/51eElCZPRBgAI9K4+Nl7F3ZAAAAAElFTkSuQmCC') no-repeat 0 0; }", 
          "#tf.busy .tf-logo { background-image:url('data:image/gif;base64,R0lGODlhMAAhANUAAP7+/t3d3fz8/N7e3v39/eDg4OLi4u3t7eHh4fDw8Pj4+Obm5ujo6Pv7++7u7urq6unp6ePj4/r6+vLy8uXl5fb29ufn5/Pz8/f39/n5+fT09O/v79zc3OTk5Ovr6/Hx8ezs7Nvb2/X19dra2t/f3////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACH/C05FVFNDQVBFMi4wAwEAAAAh/wtYTVAgRGF0YVhNUDw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMC1jMDYwIDYxLjEzNDc3NywgMjAxMC8wMi8xMi0xNzozMjowMCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNSBXaW5kb3dzIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOkI4QUUzODFCOUY1MDExRTA4MTYzQUIyOTgzRjM0MTRBIiB4bXBNTTpEb2N1bWVudElEPSJ4bXAuZGlkOkI4QUUzODFDOUY1MDExRTA4MTYzQUIyOTgzRjM0MTRBIj4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6QjhBRTM4MTk5RjUwMTFFMDgxNjNBQjI5ODNGMzQxNEEiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6QjhBRTM4MUE5RjUwMTFFMDgxNjNBQjI5ODNGMzQxNEEiLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz4B//79/Pv6+fj39vX08/Lx8O/u7ezr6uno5+bl5OPi4eDf3t3c29rZ2NfW1dTT0tHQz87NzMvKycjHxsXEw8LBwL++vby7urm4t7a1tLOysbCvrq2sq6qpqKempaSjoqGgn56dnJuamZiXlpWUk5KRkI+OjYyLiomIh4aFhIOCgYB/fn18e3p5eHd2dXRzcnFwb25tbGtqaWhnZmVkY2JhYF9eXVxbWllYV1ZVVFNSUVBPTk1MS0pJSEdGRURDQkFAPz49PDs6OTg3NjU0MzIxMC8uLSwrKikoJyYlJCMiISAfHh0cGxoZGBcWFRQTEhEQDw4NDAsKCQgHBgUEAwIBAAAh+QQEAAAAACwAAAAAMAAhAAAG/8CScEgsGo/IpHLJbDqf0Kh0Sq06BRUJwJoUYBRKBanQeXwwjS2VkNEcLAYSREmIk+4kRAeywTgbFyALdngkE0sbhYokCxV0BwiLeBEESwAWkoUJSBIdmXcFjkwEkJ8kF0YEnp8LYE0NJRIHhIoGAkUOmQUMjgSVTAsUEwIEGhCRih9EArR3FAmwGSAIoksOIQEIDxUADRMUhQtEF4UIBxklAh/gJAa/S8wDAwEDEecAE3YFEkMPeA8CAGhgUKCQMici5N2ZR8ICBgkR7qAqASAiiQQANlgsNAeKBhIBCoXUUOHOASESCs7BtIjBuyYCGmQgGIAeiQH7GMgRUnIfiP9FHRIIQPdEzAEBAi48QEAvAISPFIRMIMFADJ4FfQBcMNDxyYIQCDbAwtchZIUCEbYkIPHBwxgQYIpZqOkHCgZ5IRdMqHTtwIICtw6cIqMAQIUHBvB2heLA5rwCHgQ4MCCY39JZ3jrMGwAyAqwpH5jSG8DBAAYLicBYWMDAWM159Bh8ppLUwyDSCC58dFRGxANsZPi44sJTgYJcFAjkLmFgwgcOFkRkyEKcSIM8ECZoiOBgAUYEGgw4EHGgAwcH1YlsCBAiRIENCTwcjTAhwQIOITh0mJ2+BAYHD1AwgAMTeJCBBQoYsAsIF7zUHxEVYOWAAm844OCDnDRAQAO3YOgH4YcghphEEAAh+QQEAAAAACwFAAAAJgAhAAAG/8CSUAgYGo/IpNJYXDqfyCZ06pRSr0crdktQSLbGTAZKgJAsiYx22ZhYSI7pgUQnRR6atVCQWBTqF1MVf3V0DAJIGRGFJAhfT0UMjHQWBEYCFJMeU0UNC5MkCUYbkwuIUEUCBBuEdR1NAJmFIACWqCUMDw0SIK0FGEIZhQsKACCbtyAjCBsEEg91oiUXdAgTJSKL0pAlCiQBAQgJAAl0D0VzCAoCko1jtyUQHCQDAREYDmeIZhcarRBUmjQwEIBOAAMKDESQQIACBQytELy7BUCAAgrgvh3woG7gARB1EGhoEFDIgwcEKjAYwMHABBIYFCVYxEzAAYCchFwIQWEMhrwIHD6QEKFgwRwIAgR4CHEtZwkBBjgMYCABgAEILjEsYMCAwAeCBR7BK7Fh3oABDiosoJCgAgULFSwEqIfMqRAP4FgeOMDAgYYOGxhwCMCBwim7JQCIeBABXAIQBy4w+DBvQQJbJY8IwIDB4QcPHxxQYKCg2JY1FwbgMeohAd8LHSJgznwpwogAIBK0TvCAQ4g4p5NIcGChwITcHwpYmKCH2xIREBxMeCACzJDmQ5w1mA0Gu/Ul3r8nCS8+CAA7'); }",
          ".tf-symbol { background-image:url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA8AAAAPCAYAAAA71pVKAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA2RpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMC1jMDYwIDYxLjEzNDc3NywgMjAxMC8wMi8xMi0xNzozMjowMCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDo2RjFCMDk3MkM3OUFFMDExOTFGREJBRDY5RjdFM0NDQiIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDo1MEI3NDNERDlGMTQxMUUwOUIwQUZCRDZBQ0Y3NTMyNSIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDo1MEI3NDNEQzlGMTQxMUUwOUIwQUZCRDZBQ0Y3NTMyNSIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ1M1IFdpbmRvd3MiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDo0RjA4QUI0OTE0OUZFMDExOTFGREJBRDY5RjdFM0NDQiIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDo2RjFCMDk3MkM3OUFFMDExOTFGREJBRDY5RjdFM0NDQiIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PuNkwaAAAAF1SURBVHjaxJIxSMNQEIbv2TQpadqmEOjqYAcXh4KLs0txcHMRBBcHESc3BTdxEmdnZ0Vwc3FzEYQKbmIHM1hI0wTapk3a+N/jVayDQx08+Ai5d/9/944nUgTNGHP0h9DALdDBEqgA8Ut9At7Bk6zF1Ec8ObBADeyDt3Q6HsAmWAS6qr+m8XgcgUP8VFSSqYKWEj4C89vZMjgHMcVxnLqum7bb7dZwOLxEclUVnSnxhuq2DU7BjpoiEnwaBAFBLJ3z+Tw5jrObyWReca8bUANroAHugAGuQF1uO5vNUqFQINu2Cd3Z6JjT4AUsgHvgjkajE9/3G4PBoD7ZthT3+30SQpBpmryHSpIkVU3Tmjjm62x1Op29Xq8ndF2nUqkkVy8mjwSuFIahNMHIVC6XL1AY8iSe5x1wmWVZckJuMvVIWMCO6CaNsMh5pL1ut7vOwlwuR8Vi8Us41XkS/Mvd8P0wDOM5iqIVGJp8tZ8h/vVt+7OKPwUYAK0xGiXURoQhAAAAAElFTkSuQmCC') !important; background-repeat:no-repeat !important; background-position:center; }",
          '#tf a[data-option] { cursor:pointer; }',
          '#tf.minimized { height: 70px; }',
          '#tf.minimized #tf-stream-nav { width: 60px; }', //webkit fix
          '#tf #tf-stream-nav a.layout { display:none; }',
          '#tf.minimized #tf-stream-nav a.layout { display:block; }',
          '#tf-stream-nav { float:left; background:#fff; '+this.css3shadow('2px', 'rgba(0, 0, 0, 0.1)', '-1px', '-1px')+' border:1px solid #bbb; border-color: #bbb #fff #bbb #bbb; border-style: solid none solid solid; float: left; margin: -1px 0 0 -21px;  }',
          '#tf-stream-nav a { display:block; width:20px; height:20px; text-indent:-50px; overflow:hidden; position:relative; }',
          '#tf-stream-nav a i { display:block; width:0; height:0; border: 5px solid #fff; position:absolute; left: 4px; }',
          '#tf-stream-nav a b { display:block; width:4px; height:4px; background:@link; position:absolute; left: 7px; }',
          '#tf-stream-nav a.bottom i { border-top-color:@link; bottom:0; }',
          '#tf-stream-nav a.bottom b { bottom: 10px; }',
          '#tf-stream-nav a.top i { border-bottom-color:@link; top:0; }',
          '#tf-stream-nav a.top b { top: 10px; }',
          '#tf-stream-nav a.layout i { border:0; width: 15px; height:13px; background-color:#666; background-position:0 0; left:2px; top:3px; }',
          '#tf-stream-nav a.layout:hover i { background-color:@link;  }',
          
          
          '#tf ul.tf-filters { overflow:hidden; list-style:none; margin:0; padding:0; }',
          '#tf ul.tf-filters > li { float:left; padding:3px; margin:0; width:48px; border-right:1px solid #ebebeb; }',
          '#tf ul.tf-filters > li.invert { border-right:0; min-width:48px; }',
          '#tf ul.tf-filters > li.filter { float:right; }',
          '#tf ul.tf-filters a[data-option] { color: @link; text-transform:lowercase; display:block; text-decoration:none !important; '+this.css3rounded('2px')+' }',
          '#tf ul.tf-filters a[data-option="filter-inverted"] { color: @lighttext; background:#f5f5f5; }',
          '#tf ul.tf-filters a[data-option] > i { font-style:normal; color:@lighttext; font-size:11px; display:block; text-align:center; }',
          '#tf ul.tf-filters a[data-option] > b { font-weight:normal; font-size:11px; display:block; text-align:center; color:@link; }',
          '#tf ul.tf-filters a[data-option].checked { background: #f5f5f5; text-decoration: none; }',
          '#tf ul.tf-filters a[data-option="filter-inverted"].checked { background: @link:0.2 !important; color:@link !important; }',
          '#tf ul.tf-filters a[data-option="filter-inverted"].checked > i { color:@link; text-shadow:0 1px 0 #fff; }',
          '#tf ul.tf-filters li.disabled [data-option="filter-inverted"].checked > i, ',
          '#tf ul.tf-filters a[data-option].checked > b { color:#999 !important; }',
          '#tf ul.tf-filters a[data-option="filter-inverted"].checked > b { color:@link !important; text-shadow:0 1px 0 #fff;  }',

          '#tf ul.tf-filters li.disabled a[data-option],',
          '#tf ul.checks li.disabled a[data-option],',
          '#tf.inverted ul.tf-filters li.disabled a[data-option] { background: transparent !important; color:#999 !important; text-shadow:none !important; }',
          '#tf ul.tf-filters li.disabled a[data-option] > b,',
          '#tf ul.checks li.disabled a[data-option] > b,',
          '#tf.inverted ul.tf-filters li.disabled a[data-option] > b { color:#aaa !important; }',
          
          '#tf ul.tf-filters a[data-option].exclusive { background: @link:0.2 !important; color:@link !important; }',
          '#tf ul.tf-filters a[data-option].exclusive > i { color:@link !important; text-shadow:0 1px 0 #fff; }',
          '#tf ul.tf-filters a[data-option].exclusive > b { color:@link !important;  text-shadow:0 1px 0 #fff; }',
          
          /* inverted - passed switch and filter states when inverted */
          '#tf.inverted ul.tf-filters li.filter a[data-option] { background: #f5f5f5; }',
          '#tf.inverted ul.tf-filters li.filter a[data-option] > b { color:#999; }',
          '#tf.inverted ul.tf-filters li.filter a[data-option].checked { background: #fff; }',
          '#tf.inverted ul.tf-filters li.filter a[data-option].checked > b { color:@link !important; }',

          '#tf ul.tf-filters > li > a.stream-nav { float:left; background:#fff; margin-left:-22px; width: 12px; height:12px; }',

          '#tf .tf-stream { margin: 4px 10px 0 10px; border-bottom:1px solid #fff; }',
          '#tf .tf-stream > ul.checks > li { float:right; }',
          '#tf .tf-stream > ul.checks > li:first-child { float:left; }',
          '#tf .tf-stream > ul.checks > li.disable { width:98px; margin-right:-10px;}',
          '#tf .tf-stream > ul.checks > li.disable > a { margin-top:2px; }',
          '#tf .tf-stream > ul.checks > li.streamtitle > span { display:inline; margin:0; position:static; }',
          '#tf .tf-stream > ul.checks > li.streamtitle > i { font-style:normal; color:@link; }',
          
          '#tf-customize { position:relative; }',
          '#tf .tf-stream > p > span { color:@darktext; }',
          '#tf input[type=text] { border:1px solid #a7a7a7; padding:2px; color:#a7a7a7; font-size:11px; margin-right:6px; }',
          '#tf .tf-stream input { float:right; }',
          '#tf p.tf-version { position:absolute; top:9px; right:20px; font-size:10px; padding:0; }',
          '#tf p.tf-version a {  color:#999;  }',
          '#tf p.tf-version a:hover { color:@link; text-decoration:none;  }',        

          '#tf ul.tf-tabs { list-style:none; overflow:visible; background:#f5f5f5; border-top:1px solid #eee; height:20px; padding:5px 5px 0; margin:5px 10px; border-bottom:1px solid #eee; }',
          '#tf ul.tf-tabs li.tf-tab { float:left; cursor:pointer; border:1px solid transparent; border-bottom-color:#eee; text-align:center; height:19px; font-size:12px; line-height:19px; }',
          '#tf ul.tf-tabs li.tf-tab a { text-decoration:none; color:@link; padding:0 8px; text-shadow:0 1px 0 #fff; }',
          '#tf ul.tf-tabs li.tf-tab:hover { background:#eee; }',
          '#tf ul.tf-tabs li.tf-tab.active { background: #fff; border-color:#eee; border-bottom-color:#fff; '+this.css3rounded('2px 2px 0 0')+' }',
          '#tf ul.tf-tabs li.tf-tab.active a { color: @darktext; font-weight:bold; }',
          '#tf ul.tf-tabs li.addtofilter { float:right; margin:-2px 0 0 0; padding-right:5px; position:relative; }',
          '#tf ul.tf-tabs li.addtofilter a { font-size:11px; }',
          '#tf ul.tf-tabs li.addtofilter a:hover { color:@link !important; }',
          '#tf-filter-add { border:1px solid @lighttext; color:@lighttext; width: 160px; }',
          '#tf-filter-add.active { border-color: @darktext; color:@darktext !important; border-color:@link !important; '+this.css3shadow('3px', '@link')+' }',
     
          '#tf div[data-tab] { display:none; }',
          '#tf div[data-tab].active { display:block !important; }',
          '#tf div[data-tab] fieldset { border:1px solid @lighttext; '+this.css3rounded('3px')+' padding:0 5px 5px 5px; margin:5px 0; }',
          '#tf div[data-tab] label { padding:0 5px; }',
          
          '#tf-customize > div { display:none; padding:5px 12px; }',
          '#tf-customize > div.active { display:block; }',
          
          '#tf ul.checks { list-style:none; margin:0; padding: 0; overflow:hidden; }',
          '#tf ul.checks > li { cursor:pointer; float:left; height:20px; padding:0; margin:0; position:relative; }',

          '#tf ul.checks > li > span { display:block; margin:1px 5px; height:16px; position:relative; }',
          "#tf ul.checks > li a { color:@lighttext; font-size:12px; display:block; overflow:hidden; white-space:nowrap; height:16px; line-height:16px; text-decoration:none; text-indent:16px; margin:0; position:absolute; left:0; top:0; right:10px; text-align:left; }",
          "#tf ul.checks > li a > b { background:#fff; "+this.css3shadow('2px', '#a7a7a7 inset')+" "+this.css3shadow('2px', '#a7a7a7')+" display:block; position:absolute; height: 8px; bottom:4px; left: 3px; width: 8px; }",   /* check box */       
          "#tf ul.checks > li a:hover { color: @darktext; }",
          "#tf ul.checks > li a:hover > b { "+this.css3shadow('4px', '@link')+" } ",
          "#tf ul.checks > li a.checked { color: @darktext; }",
          "#tf ul.checks > li a.checked > b { background:@link; position:absolute; border: 0; height: 8px; bottom:4px; left: 3px; width: 8px; }",   /* check box */   
          '#tf ul.checks > li.disabled a.checked > b { background: #fff; }',
          
          "#tf ul.checks > li a > i { color:@link; font-weight:normal !important; font-size:9px; height:16px; right:0; text-indent:0; top:0; position:absolute; background:#fff; padding-right:2px; }",    /* match count */      
          
          '#tf .tf-queries { width: 100%; padding-top: 5px; }',
          '#tf .tf-queries > li { width:50%; }',
          "#tf .tf-queries > li > span > a.x { left:auto; text-indent:0; color: #999999; font-size: 9px; line-height: 16px; position: absolute; right: 0; top: 0; vertical-align: top; width: 10px; text-align:center; }",         
          '#tf .tf-queries > li > span > a.x:hover { color:@darktext; text-decoration:none; }',
          '#tf .tf-queries > li.user > span > a:first-child { font-weight:bold; }',
          '#tf .tf-queries > li.via > span > a:first-child { font-style:italic; }',
          '#tf .tf-queries > li.exclusive a > span { border-bottom:2px solid @link; color:@link !important; font-weight:bold !important; }',
          "#tf .tf-queries > li:hover > span, .tf-queries > li:hover > span > a > i  { background:#f5f5f5 !important; } ",
          "#tf .tf-queries > li.notfound a.checked > b { background: #aaa; }",
          "#tf .tf-queries > li.notfound a > i { display:none; }",
          "#tf .tf-queries > li.notfound > span > a:first-child > span { color: @lighttext !important; }",

          '#tf-customize ul.checks { list-style:none; padding:0; margin:0; overflow:hidden;}',
          '#tf-customize ul.checks > li { padding:0; margin:0; width:50%; }',
          '#tf-customize ul.checks > li > a { color: @darktext !important; }',
          '#tf-customize ul.checks > li > a:hover { color: @link !important; }',
          '#tf-customize ul.checks > li > a > b { '+this.css3shadow('2px', '@darktext')+' }',
          
          '#tf-export-settings { cursor:move; border:1px solid #eee; border-left:3px solid @link; '+this.css3shadow('2px', '@darktext')+' left:auto !important; right:auto !important; padding-left:5px; text-indent:0 !important; padding-right:5px; }',
          
          '#tf div.about { padding: 10px 0 0 0; overflow:hidden; border-top:1px solid #eee; margin-top: 10px; }',
          '#tf div.about ul li { float:right; margin-left: 8px; font-size: 11px; }',
          '#tf div.about ul li.version { float:left; margin-left:0; }',
          '#tf div.about ul li.version span { color: #aaa; font-size:9px; margin-left:5px; }',
          '#tf div.about ul li a { color:@link; text-decoration:none; }',
          '#tf div.about ul li a.tweet { display:inline-block; height:15px; width:42px; overflow:hidden; text-indent:-100px; }',
          '#tf div.about ul li a:hover { text-decoration:underline; }',
          '#tf div.support { display:none; }',
          '#tf-scroll { margin:5px 10px; overflow:auto; max-height:160px; display:none; }',
          
          '.stream-title h2 em { color: @link; font-style:normal; }',
          '.stream-title h2 div.tf { font-size: 80%; clear:left; }',
          '.stream-title h2 div.tf span.user { font-weight: bold; }',
          '.stream-title h2 div.tf span.via { font-style: italic; }',
          '#tf.minimized { height: 20px; width: 40px !important; min-width: 40px; }',
          '#tf.minimized > div, #tf.minimized ul.tf-filters, #tf.minimized ul.tf-tabs { display: none; }',
          '#tf.minimized > div.tf-header { display: block; height: auto; }',
          '#tf.minimized #tf-stream-nav a.top { left: 0; top: 0; }',
          '#tf.minimized #tf-stream-nav > a { float: left; top: 0; }',


          /* small twitter layout fixes */
          'div.tweet-activity { width:100%; }',
          'div.media-gallery-overlay { position:fixed !important; }', //avoid overlapping of video preview
          '.stream-tab.stream-tab-title { z-index:1; }',
          '.stream-title h2 { position:relative }',
          '.stream-title .go-to-list-page { position:absolute; top: 1em; right:1em; }', //assure we see "view list page" link in exclusive filter mode
          '.stream-title .stream-tabs { min-height:50px; }', //in foreign languages with long captions "top" and "with links" are hidden because of this Twitter css bug           
          /* message drawer */
          '.message-inside > span.tf { display:block !important; }',
          '#message-drawer a.x { background: none repeat scroll 0 0 #F8F8F8; color: #999999; display: inline-block; font-family: Tahoma; font-size: 12px; font-weight: bold; height: 22px; margin: -5px -10px -10px 10px;  padding: 3px 3px 2px; }',         
          '#message-drawer a.x:hover { color:#666; text-decoration:none; }',
          /* add to filter menu */
          '.tweet-actions, .tf-actions { position:absolute; right:64px; bottom:-5px; font-size:11px; }',
          '.pane-components .tweet-actions { right: -5px; }',
          '.tf-actions { right: -5px; visibility:hidden; display:block; }',
          '.stream-tweet:hover .tf-actions, .focused-stream-item .stream-tweet .tf-actions { visibility:visible; }',
          '.tweet-actions a span b, .tf-actions a span b { display:none; }',
          '.tf-actions a { outline:none!important; }',
          '.tf-actions a span b { font-weight:400; }',
          '.tf-actions a span i { text-indent:-99999px; outline:none; background:transparent url(../img/sprite-icons.png) no-repeat; width:15px; height:15px; display:inline-block; vertical-align:baseline; position:relative; margin:0 3px -3px 2px; }',
          '.tf-actions a.tf span b { display:none; }',
          '.tf-actions a.tf.dm span i { background-position:2px -30px; }',
          '.tf-actions a.tf.dm:hover span i { background-position:-13px -30px; }',
          '.tf-actions a.tf.quote span i { background-position:2px -15px; }',
          '.tf-actions a.tf.quote:hover span i { background-position:-13px -15px; }',
          '.tf-actions a.tf.menu span i { background-position:-15px 1px; }',
          '.tf-actions a.tf.menu:hover span i { background-position:-30px 1px; }',
          
          '.main-content ul.tf-menu { display:block; width:auto !important; position:absolute; top: 12px; right:0; left:auto; }',
          '.main-content ul.tf-menu li { font-size:11px; padding:3px 8px; white-space:nowrap; overflow:hidden; }',
          '.main-content ul.tf-menu li.tf-user a { font-weight:bold; }',
          '.main-content ul.tf-menu li.tf-source a { font-style:italic; }',
          
          '.main-content ul.tf-menu.drop-down { max-width:200px !important; }',
          '.main-content ul.tf-menu.drop-down li a { max-width:180px; overflow:hidden; color:@link; }',
          '.main-content ul.tf-menu.drop-down li:hover a { color:#fff; }',
           /* via link */ 
          '.stream-item .tf-via { display:none; }',
          'body.tf-filter-inverted li.stream-tab.active a.tab-text { color:#999 !important; text-decoration:line-through; }',
          'body.tf-show-via .stream-item .tf-via { display:inline; font-size:11px; color:@lighttext !important; }',
          'body.tf-show-via .stream-item .tf-via a { color:@lighttext !important; }',
          'body.tf-show-via .stream-item .tf-via a:hover { color:@link !important; }',
          /* body class enabled layout options */
          'body.tf-expand-new div#new-tweets-bar, body.tf-expand-new div.new-tweets-bar { display:none !important; }',
          '.tweet-text br { display:none; }',
          'body.tf-show-br .tweet-text br { display:block; }',
          'body.tf-small-links .main-content a.twitter-timeline-link { font-size:12px;  line-height:14px; display:inline-block; max-width:440px; overflow:hidden; vertical-align:bottom; }',
          'body.tf-small-links .main-content div.tweet-text-large a.twitter-timeline-link { max-width:430px; }',
          'body.tf-small-links .main-content div.twttr-dialog-content a.twitter-timeline-link { display:inline; }',
          '.main-content .stream-item .tweet-source { display:none; }',
          'body.tf-show-via .main-content .stream-item .tweet-source { display:inline; }',
          '#tf-compact-activities { display:none; }',
          'body.tf-compact-activities div.dashboard .component.tf.activities, ',
          'body.tf-compact-activities div.dashboard .component.tf.latest .tweet-activity { display:none; }',
          'body.tf-compact-activities #tf-compact-activities { display:block; }',
          'body.tf-hide-topbar { background-position: top left !important; }',
          'body.tf-hide-topbar div#top-stuff { top: -30px; height:40px; }',
          'body.tf-hide-topbar div#top-bar-bg,',
          'body.tf-hide-topbar div#top-bar { visibility:hidden;  }',
          'body.tf-hide-topbar div#top-stuff[data-over="0"][data-focused="0"] #global-nav li.active a { background:rgba(0,0,0,0); }',
          'body.tf-hide-topbar div#top-stuff[data-over="0"][data-focused="0"] #message-drawer .message { margin-top:-15px; }',
          'body.tf-hide-topbar div#top-stuff[data-over="1"],',
          'body.tf-hide-topbar div#top-stuff[data-focused="1"] { top: 0; }',
          'body.tf-hide-topbar div#top-stuff[data-over="1"] div#top-bar-bg,',
          'body.tf-hide-topbar div#top-stuff[data-over="1"] div#top-bar,',
          'body.tf-hide-topbar div#top-stuff[data-focused="1"] div#top-bar-bg,',
          'body.tf-hide-topbar div#top-stuff[data-focused="1"] div#top-bar { visibility:visible; }',
          'body.tf-hide-topbar div#page-outer { padding-top: 25px; }',
          'body.tf-hide-topbar div#details-pane-outer { margin-top:0 !important; top: 25px !important; }',
          'body.tf-hide-latest div.dashboard .component.tf.latest .tweet-activity { display:none; }', //not implemented
          'body.tf-fixed-dashboard div.dashboard { position:fixed; margin-left:540px;  width: 340px;  }',
          'body.tf-hide-trends div.dashboard > div.component.trends { display:none; }',
          'body.tf-hide-wtf div.dashboard > div.component.wtf { display:none; }',
          'body.tf-hide-ad div.dashboard > div.component.ad { display:none; }',
          'body.tf-hide-invite div.dashboard > div.component.invite { display:none !important; }',
          'body.tf-minify-menu div.footer.inline-list li { display:none }',
          'body.tf-minify-menu div.footer.inline-list li:nth-child(5),',
          'body.tf-minify-menu div.footer.inline-list li:nth-child(9),',
          'body.tf-minify-menu div.footer.inline-list li:nth-child(15) { display:inline }',
          'body.tf-hide-question div.tweet-box-title { display:none; }',
          'body.tf-hide-tweetbox div.main-tweet-box { display:none; }',
          'body.tf-hide-tweetbox div.page-header { padding-top:4px; }',
          'body.tf-hide-tweetbox div.page-header ul.stream-tabs { margin-top:5px; }',
          'span.tf-usertime { display:none; color:#5EBF7E !important; font-size:11px; }',
          'body.tf-show-usertime span.tf-usertime { display:inline; }',
          'body.tf-hide-promoted-content .promoted-trend,',
          'body.tf-hide-promoted-content .promoted-account { display:none !important; }',
          '.tweet-corner i.tfu { margin-left:-3px; }',
          'i.tfu { display:none; }',
          "body.tf-show-friends i.tfu { background-repeat:no-repeat; display:inline-block; height:13px; width:1px; background-position:0 -60px; background-image:url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAxCAYAAADukUiUAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyBpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMC1jMDYwIDYxLjEzNDc3NywgMjAxMC8wMi8xMi0xNzozMjowMCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNSBXaW5kb3dzIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOkE0M0U2Mzc3QTg0MDExRTBCOTEzQjM0NTFFRTMzN0NEIiB4bXBNTTpEb2N1bWVudElEPSJ4bXAuZGlkOkE0M0U2Mzc4QTg0MDExRTBCOTEzQjM0NTFFRTMzN0NEIj4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6QTQzRTYzNzVBODQwMTFFMEI5MTNCMzQ1MUVFMzM3Q0QiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6QTQzRTYzNzZBODQwMTFFMEI5MTNCMzQ1MUVFMzM3Q0QiLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz6xg46LAAADfUlEQVR42uyWT0gUURzH35/ZnVVnt0xyddR0if5cgog0F5IoKiiiP5dE8GZodDDoEkhQxzpEeI6oYyB0sYu3giKCjlYQCWq0qLlm7t9xZmf6/mbfyGx2sFsHH3x4w+/9fu/3/c3bN7/lExMTzPM8xjn3ZxqYBzE1gXGyh9eEcmBSShaJRJjjOEZLS8u9jo6OsUqlYmqaxoiagGDQAoKGW1tb9yKoWdf10bCz7wMS4IoQ4jgcUo2NjT2UiWSYpnkzl8t1F4vFb/B5B95QQByL15PJZK9hGL5jPp/3d4vH4zHYTiGAzc/PpyFxgQK+I+VAJpN5jqBj0Wh0QwIF27bNFhcXp13X7YeKT5pamMXCUDabnUwkEqlwXci2hLUb8PkU1BDstoqUVqFQCPtTBhvTykbRlFYFtCHt/nK5TJIyMFmwUbY2SOnC/NF/raRX0QAoy13MadCHDW5hXgGJwE8LZf8CLmLX98AhAwIe4fltWBIPH8pWhmD/OLYDtjL8gxsZGfnTfhlcAtdAhQzrjmT7ktm/ZiDbWUCnnd6KpAtgBjxWWeo2ScIYAEfU4g5wGyyB0+CherbA0yAgpT4rY+AXKCn7fRAD58EoBQSSaJcFJccOKXBBJzipXsBCEEDpHoADinCNw+Cl+vnXFE07ryk5cdChMvxQ9pqimSrWAIfAYWCqt1VWNb7FPa4JoGy9oAheqF3PgH4wpT66NQF5VTxdyayyPQGfwc/tK/qfXdHS605WtjXGBTqlG5yJO8g83sQ4G8dRVdfovLyNDGi7Wj0TEYN5TsGI7u67p5vnxjynaHJZx3ikAS7uH5Jg4Bp6XDQxrCdP7NWTfc0i1jTKo4b/G9rURbnUjovojlS06WCPVk83lbM688RNe22u27VsdFEedFEvDpHX68x0byRBV0DimzLn69V3dcb0Xe2nnMIiy81MpT2ntMCLr/aw0rroklrsudF59Jis34maK+odSuZaeZaf+zDtWLl+zmXQRcWss14aKi9PTza0tKeQcUO3tZxZckq5G1xK1UW5Lxc+cpV7JYs589WLyarqkMJmQqwwHnRRUX3PCGmTWmm/U8yz8lokgxosPe6kZIS3caF3ceH5XVSjw/IPDF3UyslV95cY9yryGX1THYtfFYLdgUNCHQPzi6aTpn6MKrsQ/h4Jq12U/kcx0YMn6qJfyfZbgAEAfjx5x2g3QsAAAAAASUVORK5CYII=') }",
        ].join("\n");
        this.refreshcolors();
        var that=this;
        style = style.replace(/@([a-z]+)\:([10]\.[0-9]+)/g, function(match, color, alpha) {            //! alpha=1 is ignored, use 1.0
          return twttr.helpers.hexToRGBA(that.colors[color], alpha);
        });
        for (var color in this.colors) {
          style = style.split('@'+color).join(this.colors[color]);
        }
        this.setcss(name, style);
        this.widget.removeAttr('style');
        break;
      }
    }
    return true;
  };
  
  // Color manipulation functions
  // Source: http://stackoverflow.com/questions/1507931/generate-lighter-darker-color-in-css-using-javascript
  
  Tweetfilter.prototype.zero_pad = function(num, totalChars) {
      var pad = '0';
      num = num + '';
      while (num.length < totalChars) {
          num = pad + num;
      }
      return num;
  };
  // Ratio is between 0 and 1
  Tweetfilter.prototype._changecolor = function(color, ratio, darker) {
      // Trim trailing/leading whitespace
      color = color.replace(/^\s*|\s*$/, '');

      // Expand three-digit hex
      color = color.replace(
          /^#?([a-f0-9])([a-f0-9])([a-f0-9])$/i,
          '#$1$1$2$2$3$3'
      );

      // Calculate ratio
      var difference = Math.round(ratio * 256) * (darker ? -1 : 1),
        // Determine if input is RGB(A)
        rgb = color.match(new RegExp('^rgba?\\(\\s*' +
            '(\\d|[1-9]\\d|1\\d{2}|2[0-4][0-9]|25[0-5])' +
            '\\s*,\\s*' +
            '(\\d|[1-9]\\d|1\\d{2}|2[0-4][0-9]|25[0-5])' +
            '\\s*,\\s*' +
            '(\\d|[1-9]\\d|1\\d{2}|2[0-4][0-9]|25[0-5])' +
            '(?:\\s*,\\s*' +
            '(0|1|0?\\.\\d+))?' +
            '\\s*\\)$'
        , 'i')),
        alpha = !!rgb && rgb[4] != null ? rgb[4] : null,

        // Convert hex to decimal
        decimal = !!rgb? [rgb[1], rgb[2], rgb[3]] : color.replace(
            /^#?([a-f0-9][a-f0-9])([a-f0-9][a-f0-9])([a-f0-9][a-f0-9])/i,
            function() {
                return parseInt(arguments[1], 16) + ',' +
                    parseInt(arguments[2], 16) + ',' +
                    parseInt(arguments[3], 16);
            }
        ).split(/,/);

      // Return RGB(A)
      return !!rgb ?
        'rgb' + (alpha !== null ? 'a' : '') + '(' +
            Math[darker ? 'max' : 'min'](
                parseInt(decimal[0], 10) + difference, darker ? 0 : 255
            ) + ', ' +
            Math[darker ? 'max' : 'min'](
                parseInt(decimal[1], 10) + difference, darker ? 0 : 255
            ) + ', ' +
            Math[darker ? 'max' : 'min'](
                parseInt(decimal[2], 10) + difference, darker ? 0 : 255
            ) +
            (alpha !== null ? ', ' + alpha : '') +
            ')' :
        // Return hex
        [
            '#',
            this.zero_pad(Math[darker ? 'max' : 'min'](
                parseInt(decimal[0], 10) + difference, darker ? 0 : 255
            ).toString(16), 2),
            this.zero_pad(Math[darker ? 'max' : 'min'](
                parseInt(decimal[1], 10) + difference, darker ? 0 : 255
            ).toString(16), 2),
            this.zero_pad(Math[darker ? 'max' : 'min'](
                parseInt(decimal[2], 10) + difference, darker ? 0 : 255
            ).toString(16), 2)
        ].join('');
  };
  
  Tweetfilter.prototype.lighten = function(color, ratio) {
    return this._changecolor(color, ratio, false);
  };
  
  Tweetfilter.prototype.darken = function(color, ratio) {
    return this._changecolor(color, ratio, true);
  };
  
  
  //get json value from local storage with default
  Tweetfilter.prototype.getvalue = function(name, defaultvalue) {
    var value = localStorage.getItem(name);
    try {
      return typeof value === 'string' && value.length ? JSON.parse(value) : defaultvalue;
    } catch (e) {
      return defaultvalue;
    }
  };

  //set json value in local storage
  Tweetfilter.prototype.setvalue = function(name, value) {
    if (value === null) {
      localStorage.removeItem(name);
      return null;
    } else {
      localStorage.setItem(name, JSON.stringify(value));
      return this.getvalue(name);
    }
    return false;
  };

  //encode special html characters
  Tweetfilter.prototype.encodehtml = function(str) {
    if (typeof str === "string") {
      str = str.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#039;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
    return str;
  };

  //decode html source
  Tweetfilter.prototype.decodehtml = function(str) {
    if (typeof str === "string") {
      str = str.replace(/&gt;/ig, ">").replace(/&lt;/ig, "<").replace(/&#039;/g, "'").replace(/&quot;/ig, '"').replace(/&amp;/ig, '&');
    }
    return str;
  };
  
  
  Tweetfilter.prototype.arraydiff = function(a, b) {
   var diff = [];
   for (var i=0,imax=a.length;i<imax;i++) {
      if (!~b.indexOf(a[i])){
        diff.push(a[i]);
      }
    }
    return diff;
  }
  
  //<debug> function. only called from outside the object scope or by single recursion
  Tweetfilter.prototype._debug = function() {
    var args = Array.prototype.slice.call(arguments); //convert to array
    var that = window.twtfilter; //"this" is window.console
    var debuggroup = false, level = 'L', funcname; //default to ungrouped console.log
    if (typeof args[0] === 'string' && args[0][1] === ':') {
      level = args[0][0];
      if (level === 'F') {
        funcname = args.shift().substr(2);
        debuggroup = 'Function '+funcname;
        if (debuggroup !== that._debuggroup) {
          if (debuggroup) {
            if (that._debugfuncs && (!that._debugfunctions.length || !!~that._debugfunctions.indexOf(funcname))) {
              this.log('%c'+debuggroup, 'color:#1F6EBF; border-top:1px dashed #1F6EBF; margin-top:10px; padding-top:5px; font-weight:bold;');
            }
          }
          that._debuggroup = debuggroup;
        }
        that._debug.apply(this, args);
        return;
      } else {
        args[0] = args[0].substr(2);
      }
    }
    funcname = that._debuggroup.substr(9);
    if (that._debuglevels.indexOf(level) > -1 && 
       (!that._debugfunctions.length || !!~that._debugfunctions.indexOf(funcname)) && 
       (!that._debugskipfunctions.length || !~that._debugskipfunctions.indexOf(funcname))) {
      if (!that._debuggrouped && that._debuggroup) {
        if (typeof args[0] === 'object') {
          args.splice(0, 0, ''); //insert dummy element to avoid string conversion of object to debug
        }
        args[0]='%c'+args[0];
        if (level === 'D' || level === 'L') {
          args.splice(1,0,'padding-left:2em;');
        } else {
          args.splice(1,0,'background-position:2em 0; padding-left:3.5em;');
        }
      } 
      this[({'D':'debug', 'E':'error', 'W':'warn', 'I':'info', 'L':'log'})[level]].apply(this, args);
    }
  };
  
  
  var _D, _F;
  _D = _F = function() {}; //shorthand debug function
// </debug>
  window.twtfilter = new Tweetfilter; //create a neighbor of twttr
// <debug>
  if (!!window.twtfilter.debug && !!window.console) {
    window.twtfilter._debuggroup = false;
    window.twtfilter._debugfuncs = true;
    _D = function() {
      if (typeof console.log.apply === 'function') { //check for bug in firebug 1.8a for firefox 4
        window.twtfilter._debug.apply(console, arguments);
      } else { //simple and ugly logging arguments as an array
        console.log(arguments);
      }
    };
    _F = function(fctname) {
      return 'F:'+fctname;
    }
  }
// </debug>
};

if (window.top === window.self && //don't run in twitter's helper iframes
  !document.getElementsByClassName('twtfilterscript').length)  //don't inject multiple times (bookmarklet)
{ 
  if (window.location.toString().match(/^https?\:\/\/twitter\.com\/(#.*)?$/)) { //only run on twitter.com
    var tfscript = document.createElement("script"); //create new <script> element
    tfscript.id = 'tfs'+(Math.floor(Math.random()*100000));  //random id to prevent fancy browser caching (?)
    tfscript.className = 'twtfilterscript';  //classname to identify script block
    var scripttext = TweetfilterPrototype.toString(); //assign the whole prototype code to script
    tfscript.text = scripttext.substring(scripttext.indexOf('function Tweetfilter'), scripttext.lastIndexOf('}')); //unwrap the function
    document.body.appendChild(tfscript); //inject the script 
  } else { //currently not on twitter.com
    if (confirm("Tweetfilter only runs on twitter.com.\nDo you want to go there now?")) {
      window.location.href='https://twitter.com/'; 
    }
  }
}