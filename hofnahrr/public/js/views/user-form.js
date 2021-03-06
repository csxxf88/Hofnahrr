/*global define*/

/**
 * @file user-form.js
 * @description View for managing user data.
 */

define([
    'underscore',
    'data-retriever',
    'templater',
    'views/templated-bridge',
    'settings',
   'text!tmpl/user-form.tmpl'
], function (
    _,
    DataRetriever,
    Templater,
    TemplatedBridgeView, 
    settings,
    tmplUserForm
) {
    'use strict';

    var UserFormView;

    UserFormView = TemplatedBridgeView.extend({
        tagName : 'div',
        template : tmplUserForm,
        events : function () {
            return {
                'submit' : 'onSubmit',
                'click .user-delete' : 'onDelete',
            };
        },

        initialize : function () {
            TemplatedBridgeView.prototype.initialize.apply(this, arguments);
            _.bindAll(this, 'onSubmit');
        },


        onSubmit : function (e) {
            e.preventDefault();

            if (e.target.checkValidity()) {
                var origData,
                    data = (new DataRetriever({
                        el : $(e.target)
                    })).getData();

                origData = this.model ? this.model.toJSON() : {};

                _.extend(origData, data);

                this.trigger('update-user', origData);
            }

        },

        onDelete : function (e) {
            e.preventDefault();
            this.trigger('delete-user', this.model ? this.model.id : -1);
        }
    });


    return UserFormView;
});

