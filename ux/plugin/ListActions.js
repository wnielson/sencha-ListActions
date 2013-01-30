/**
 *  @class Ext.ux.plugin.ListActions
 *  @author Weston Nielson <wnielson@github>
 *
 *  This plugin adds the ability to select multiple items in a list and then
 *  perform certain actions on the selected items.
 *
 *      @example miniphone preview
 *      Ext.create('Ext.List', {
 *          fullscreen: true,
 *          itemTpl: '{title}',
 *          data: [
 *              { title: 'Item 1' },
 *              { title: 'Item 2' },
 *              { title: 'Item 3' },
 *              { title: 'Item 4' }
 *          ],
 *          items: [{
 *              xtype: 'toolbar',
 *              docked: 'top',
 *              items: [{
 *                  xtype: 'button',
 *                  name: 'listactions'
 *              }]
 *          }],
 *          plugins: [{
 *              xclass: 'Ext.ux.plugin.ListActions',
 *              // This toolbar appears at the bottom of the list when in
 *              // "action" mode
 *              actionsToolbar: {
 *                  items: [{
 *                      // Any button with a string like "(0)" will display the
 *                      // current number of selected items
 *                      text: 'Delete (0)',
 *                  
 *                      // The event 'listactiondelete' will be fired on the
 *                      // associated @{link Ext.List}.
 *                      autoEvent: 'delete'
 *                  }]
 *              },
 *              // This is an optional configuration value for controlling the
 *              // button that toggles "action" mode
 *              actionToggleButton: {
 *                  // The button defined above is a child component of
 *                  // the associated @{link Ext.List}, so it will be retreived
 *                  // via a call like `list.down(button[name="listactions"])`.
 *                  // Alternatively, this can be a function that accepts the
 *                  // @{link Ext.List} as the only argument and returns the
 *                  // @{link Ext.Button} to used for toggling the mode of the list.
 *                  selector: 'button[name="listactions"]',
 *
 *                  // This text will be set on the button retreived from
 *                  // `selector` above.
 *                  enableText: 'select',
 *                  disableText: 'cancel' // This is the default
 *              }
 *          }]
 *      });
 *
 *
 */
Ext.define('Ext.ux.plugin.ListActions', {
    extend: 'Ext.Base',
    alias: 'plugin.listactions',
    
    mixins: {
        observable: 'Ext.mixin.Observable'
    },

    requires: [
        'Ext.Anim',
        'Ext.Button',
        'Ext.DomQuery',
        'Ext.Function'
    ],
    
    config: {
        /**
         *  @cfg {Ext.dataview.List} list
         *  The list to which this PullRefresh plugin is connected.
         *  This will usually by set automatically when configuring the list
         *  with this plugin.
         *  @accessor
         */
        list: null,

        /**
         *  @cfg {Boolean} enabled
         *  Controls whether or not the list is in "action" mode.
         *  @accessor
         */
        enabled: false,

        /**
         *  @cfg {Object} actionsToolbar
         *  Configuration options for the toolbar that appears when the list is
         *  in action mode.
         *  @accessor
         */
        actionsToolbar: {},

        /**
         *  @cfg {Integer} maxButtonDisplayCount
         *  If more than this number of items are selected, then the actio button
         *  text will display `maxButtonDisplayCount-1` and a "+".  For example, if
         *  100 items are selected, and `maxButtonDisplayCount` is set to `99`, 
         *  "(99+)" will be displayed instead of "(100)".
         */
        maxButtonDisplayCount: 99,

        actionToggleButton: {},

        /**
         *  @cfg {Object} showAnimation
         *  Configuration options for the animation used to show the select icon.
         *  @accessor
         */
        showAnimation: {
            direction: 'right',
            autoClear: false,
            before: function(el) {
                this.from = {
                    '-webkit-transform': 'translateX(0)'
                    //'padding-right': '0'
                };
                this.to = {
                    '-webkit-transform': 'translateX(35px)'
                    //'padding-right': '35px'
                };
            }
        },

        /**
         *  @cfg {Object} hideAnimation
         *  Configuration options for the animation used to hide the select icon.
         *  @accessor
         */
        hideAnimation: {
            direction: 'left',
            autoClear: false,
            before: function(el) {
                this.from = {
                    '-webkit-transform': 'translateX(35px)'
                    //'padding-right': '35px'
                };
                this.to = {
                    '-webkit-transform': 'translateX(0)'
                    //'padding-right': '0'
                };
            }
        }
    },

    constructor: function(config) {
        this.initConfig(config);
    },

    init: function(list) {
        var me = this;

        me.setList(list);

        // Call our custom `doUpdateListItem` method after the list's version
        // has been called
        Ext.Function.interceptAfter(list, 'doUpdateListItem',
            function(item, index, info) {
                me.doUpdateListItem(item, index, info);
            }
        );

        // These methods are added to the associated list for convinience
        list.enableActions      = Ext.Function.bind(me.doSetEnabled, me, [true]);
        list.disableActions     = Ext.Function.bind(me.doSetEnabled, me, [false]);
        list.toggleActions      = Ext.Function.bind(me.doSetEnabled, me, [null]);
        list.getActionsEnabled  = Ext.Function.bind(me.isEnabled, me);

        list.addListener('select',   me.onItemSelect, me);
        list.addListener('deselect', me.onItemSelect, me);

        list.addCls('x-list-plugin-listaction');

        actionsToolbar = Ext.merge({
            xtype: 'toolbar',
            docked: 'bottom',
            style: 'position: absolute; bottom: 0; left: 0; right: 0',
            ui: 'light',
            hidden: true,
            name: 'actionsbar',
            layout: {
                pack: 'center',
                align: 'center' // align center is the default
            },
            showAnimation: {
                type: "slide",
                direction: 'up',
                duration: 200
            },
            hideAnimation: {
                type: "slide",
                direction: 'down',
                out: true,
                duration: 200
            }
        }, me.getActionsToolbar());

        me._actionsToolbar = list.add(actionsToolbar);

        Ext.each(me._actionsToolbar.query('button'), function(button) {
            if (button.getAutoEvent()) {
                button.addListener('release', function() {
                    list.fireEvent('listaction'+button.getAutoEvent().name, list);
                });
            }
        });
        
        me._showAnimation = new Ext.Anim(me.getShowAnimation());
        me._hideAnimation = new Ext.Anim(me.getHideAnimation());

        list.addListener('painted', function() {
            me.setActionToggleButton(me.getActionToggleButton());
        });
        
    },

    /**
     *  @private
     *
     *  Callback for when active items are added to the list.
     *  This keeps the viewable items in sync.
     */
    doUpdateListItem: function(item, index, info) {
        if (this.getEnabled()) {
            if (!Ext.DomQuery.selectNode('.x-button-select', item.element.dom)) {
                // only add a button if we don't have one already
                var list     = this.getList(),
                    selected = item.element.hasCls(info.selectedCls),
                    button   = Ext.create('Ext.Button', {
                        ui:         'select',
                        iconMask:   true,
                        iconCls:    'check2'
                    });

                if (selected) {
                    button.element.addCls('selected');
                }
                
                button.renderTo(Ext.DomQuery.selectNode('.x-inner.x-list-item-inner', item.element.dom));

                // TODO: Precalculat this stuff
                offsetX = ((item.element.getHeight()/2)-(button.element.getHeight()/2));
                button.setStyle('top: '+offsetX+'px');
            }
        }
    },

    /**
     *  Enables or disables the action mode of the list.  If `enabled` is a
     *  boolean, then the mode is changed accordingly.  If `enabled` is not a
     *  boolean, then the mode is toggled.
     */
    doSetEnabled: function(enabled, suppress) {
        var me       = this,
            list     = this.getList(),
            enabled  = Ext.isBoolean(enabled) ? enabled : !this.getEnabled(),
            suppress = Ext.isBoolean(suppress)? suppress : false;

        this.setEnabled(enabled);

        if (enabled) {
            list.down('toolbar[name="actionsbar"]').show();
            list.addCls('x-list-plugin-listaction-enabled');

            Ext.each(list.getViewItems(), me.doShowItemAnimation, me);
            Ext.Function.defer(me.doEnableActions, me._showAnimation.config.duration, me, [suppress]);
        } else {
            list.down('toolbar[name="actionsbar"]').hide();
            list.deselectAll();
            
            Ext.each(list.getViewItems(), me.doHideItemAnimation, me);
            Ext.Function.defer(me.doDisableActions, me._hideAnimation.config.duration, me, [suppress]);
        }

        me.updateActionButtonsText(0);

        scrollToTopOnRefresh = list.getScrollToTopOnRefresh();
        list.setScrollToTopOnRefresh(false);
        list.doRefresh(list);
        list.setScrollToTopOnRefresh(scrollToTopOnRefresh);

        return enabled;
    },

    doShowItemAnimation: function(item) {
        el = Ext.DomQuery.selectNode(".x-inner.x-list-item-inner", item.element.dom);
        this._showAnimation.run(el);
    },

    doHideItemAnimation: function(item) {
        el = Ext.DomQuery.selectNode(".x-inner.x-list-item-inner", item.element.dom);
        this._hideAnimation.run(el);
    },

    doEnableActions: function(suppress) {
        var list = this.getList();

        list.setDisableSelection(false);
        list.setMode('MULTI');
        
        if (!suppress) {
            list.fireEvent('actionsenabled', list, this);
        }
    },

    doDisableActions: function(suppress) {
        var list = this.getList();

        list.removeCls('x-list-plugin-listaction-enabled');
        list.setDisableSelection(true);
        list.setMode('SINGLE');
                
        if (!suppress) {
            list.fireEvent('actionsdisabled', list, this);
        }
    },

    isEnabled: function() {
        var list = this.getList();
        return list.element.hasCls('x-list-plugin-listaction-enabled');
    },

    /**
     *  @private
     *
     *  Sets the text of the buttons in the `actionsToolbar`.  This looks for a
     *  token in the `text` attribute of every button in the toolbar which
     *  looks like "(0)".  If such a token is found, it is replaced with the
     *  number of currently selected items in the list.
     */
    updateActionButtonsText: function(count) {
        var me = this;

        Ext.each(this._actionsToolbar.query('button'), function(button) {
            text = button.getText();
            if (text) {
                // Search for "(\d+)" and replace it with the number of
                // currently selected items.
                if (count > me.getMaxButtonDisplayCount()) {
                    count = me.getMaxButtonDisplayCount()+"+";
                }
                button.setText(text.replace(/\(\d+\+?\)/g, '('+count+')'));
            }

            if (count < 1) {
                button.setDisabled(true);
            } else {
                button.setDisabled(false);
            }
        });
    },

    applyActionToggleButton: function(actionToggleButton) {
        var me = this,
            list = me.getList(),
            button,
            config = {
                selector:    null,
                button:      null,
                enableText:  'select',
                disableText: 'cancel'
            };

        if (list && Ext.isDefined(actionToggleButton.selector)) {

            if (Ext.isFunction(actionToggleButton)) {
                config = Ext.merge(config, {
                    selector:   actionToggleButton
                });
            } else if (Ext.isString(actionToggleButton)) {
                config = Ext.merge(config, {
                    selector: function(list) { return list.down(actionToggleButton); }
                });
            } else {
                config = Ext.merge(config, actionToggleButton);
            }

            if (!config.button) {
                if (Ext.isFunction(config.selector)) {
                    config.button = config.selector(list);
                } else {
                    config.button = list.down(config.selector);
                }
            }
            
            if (config.button) {
                config.button.addListener('tap',    me.toggleActionButton, me);
                list.addListener('actionsdisabled', me.toggleActionButton, me);
                list.addListener('actionsenabled',  me.toggleActionButton, me);

                config.button.setText(config.enableText);

                return config;
            }
        }

        return actionToggleButton;
    },

    getActionToggleButtonEl: function() {
        var config = this.getActionToggleButton();

        if (config.button) {
            return config.button;
        }

        return false;
    },

    toggleActionButton: function(el) {
        var list            = this.getList();
            toggleActions   = true,
            config          = this.getActionToggleButton(),
            button          = this.getActionToggleButtonEl();

        if (!button) {
            return;
        }

        if (el.isXType('list', false)) {
            toggleActions = false;
        }

        if (button.getText() == config.enableText) {
            if (toggleActions) {
                list.enableActions();
            } else {
                button.setText(config.disableText);
            }
        } else {
            if (toggleActions) {
                list.disableActions();
            } else {
                button.setText(config.enableText);
            }
        }
    },

    onItemSelect: function(list, record, e) {
        if (this.getEnabled()) {
            this.updateActionButtonsText(list.getSelectionCount());
        }
    }
});