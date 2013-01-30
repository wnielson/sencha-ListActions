Ext.define('MyApp.view.Main', {
    extend: 'Ext.tab.Panel',
    xtype: 'main',
    requires: [
        'Ext.TitleBar',
        'Ext.Video',
        'Ext.List',
        'Ext.data.Store',
        'Ext.ux.plugin.ListActions',
    ],
    config: {
        tabBarPosition: 'bottom',

        items: [{
            xtype: 'list',

            title: 'Welcome',
            iconCls: 'home',

            styleHtmlContent: true,
            scrollable: true,

            plugins: [{
                xclass: 'Ext.ux.plugin.ListActions',
                actionsToolbar: {
                    items: [{
                        text: 'Delete (0)',
                        ui: 'decline',
                        eventName: 'delete'
                    },{
                        text: 'Move (0)',
                        eventName: 'move'
                    },{
                        text: 'Mark (0)',
                        eventName: 'mark'
                    }]
                },
                actionToggleButton: {
                    selector: function(list) {
                        return list.down('button[name="listactions"]');
                    },
                    enableText: 'select',
                    disableText: 'cancel'
                }
            }],

            items: {
                docked: 'top',
                xtype: 'titlebar',
                title: 'Welcome to Sencha Touch 2',
                items: [{
                    xtype: 'button',
                    name: 'listactions'
                }]
            },

            itemTpl: '{name}',

            data: [{
                name: 'Joe'
            },{
                name: 'Bob'
            },{
                name: 'Megan'
            },{
                name: 'Susan'
            }]
        }]
    }
});
