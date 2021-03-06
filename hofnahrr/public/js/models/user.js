/*global define*/
define([
    'underscore', 'backbone', 'settings'
], function (_, Backbone, settings) {
    'use strict';

    var UserModel;

    UserModel = Backbone.Model.extend({
        initialize : function (attributes, options) {
            Backbone.Model.prototype.initialize.apply(this, attributes);
            this.options = options;
        },
        url : function () {
            return this.options.url;    
        },

        login : function (data, options) {
            var url = this.url() + 'login' + '?realm=' + settings.BASE_URL;
            options || (options = {});
            this.save(data, _.extend({
                url : url
            }, options));
        },  

        logout : function (options) {
            var url = this.url() + 'logout';
            options || (options = {});
            this.attributes = {};
            this.save(null, _.extend({url : url}, options));
            this.trigger('change');
        },

        signup : function (data, options) {
            var url = this.url();
            options || (options = {});
            this.save(data, _.extend({url : url}, options));
        },

        isLoggedIn : function (onTrue, onFalse) {
            var url = this.url() + 'me';
            this.fetch({
                url : url,
                success : function (result) {
                    if (result.get('username')) {
                        (onTrue || function () {})();
                    }
                    else {
                        (onFalse || function () {})();
                    }
                },
                error : function () {
                    (onFalse || function () {})();
                }
            });
        }
    });

    return UserModel;
});
