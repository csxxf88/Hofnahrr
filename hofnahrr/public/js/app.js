/*global define*/
define([
    'jquery.tagsinput', 
    'underscore', 
    'backbone', 
    'templater',
    'lang',
    'data-retriever',

    'views/list',
    'views/template',
    'views/templated-bridge',
    'views/modal',
    'views/file-drop',

    'models/sight',
    'models/user',

    'router/hofnahrr',

    'text!tmpl/sight-form.tmpl',
    'text!tmpl/sights-list.tmpl',
    'text!tmpl/sight-link.tmpl',
    'text!tmpl/modal.tmpl',
    'text!tmpl/picture-form.tmpl',
    'text!tmpl/upload.tmpl',
    'text!tmpl/image.tmpl'
], function (
    $, _, Backbone, Templater, lang, DataRetriever, 

    ListView, TemplateView, TemplatedBridgeView, ModalView, FileDropView,

    SightModel, UserModel,

    HofnahrrRouter,
            
    tmplSightForm, tmplSightsList, tmplSightLink, tmplModal,
    tmplPictureForm, tmplUpload, tmplImage
) {


    var AppController,
        SightsCollection = Backbone.Collection.extend({
            url : 'sights/',
            model : SightModel,
            initialize : function () {
                
            }
        });

    AppController = function () {
        lang = lang.de;
        Templater.setLanguage(lang);

        this.selectedSight = null;

        _.bindAll(this, 
                  'onEditSight', 
                  'onOpenSight', 
                  'onCreateSight', 
                  'onCreateNewSight',
                  'onUserLoggedIn', 
                  'onShowLogin', 
                  'onLogout', 
                  'onLogin', 
                  'onSignup');

        this.currentUser = new UserModel({}, {
            url : 'users'
        });

        this.collection = new SightsCollection();

        this.initTemplateHelpers();

        this.createSightFormView();
        this.createPictureFormView();
        this.createListView();
        this.createFileDropView();

        this.createRouter();

        this.addEventListeners();

        
        this.currentUser.isLoggedIn(this.onUserLoggedIn, this.onShowLogin);
    };

    AppController.prototype = {
        initTemplateHelpers : function () {
            var that = this;
            Templater.registerHelper('sightsOptions', function (current, options) {
                var html = '<option value="-1">' + Templater.i18n('sight_dont_know') + '</opion>';
                that.collection.each(function (item) {
                    var selected = current === item.id ? 'selected="selected"' : '';
                    html += options.fn(_.extend({selected : selected}, item.attributes));
                }); 
                return html;
            });
        },

        createFileDropView : function () {
            this.fileDropView = new FileDropView({
                el : $('<div/>'),
                template : tmplUpload,
                fileTemplate : tmplImage,
                uploadToPath : 'http://localhost:2403/pictures'
            });

            this.fileDropView.files.on('uploaded', this.onFileUploaded);
            $('body').append(this.fileDropView.render().el);
        },

        onFileUploaded : function (file) {
            console.log(file);
        },

        createSightFormView : function () {
            this.sightFormView = new TemplatedBridgeView({
                el : $('<div/>'),
                template : tmplSightForm,
                events : function () {
                    return {
                        'submit' : function (e) {
                            e.preventDefault();

                            if (e.target.checkValidity()) {
                                var data = (new DataRetriever({
                                    el : $(e.target)
                                })).getData();

                                data.location = {
                                    latitude : data.lat,
                                    longitude : data.lng
                                };
                                data.tags = data.tags.split(',');
                                data.links = data.links.split(',');

                                delete data.lat;
                                delete data.lng;

                                this.trigger('create-sight', data);
                            }

                        }
                    };
                }
            });

            this.sightFormView.afterRender = function () {
                this.$('#sight-tags').tagsInput({
                    height : '50px;',
                    defaultText : Templater.i18n('sight_add_tag')
                });
                this.$('#sight-links').tagsInput({
                    height : '50px;',
                    defaultText : Templater.i18n('sight_add_link')
                });
            };
        },

        createPictureFormView : function () {
            this.pictureFormView = new TemplatedBridgeView({
                el : $('<div class="row-fluid"/>'),
                template : tmplPictureForm,
                events : function () {
                    return {
                        'submit' : function (e) {
                            // TODO
                        }
                    };
                }
            });
        },

        createSightModal : function () {
            var that = this;
            if (!this.sightModal) {
                this.sightModal = new ModalView({
                    template : tmplModal,
                    modalOptions : {
                        show : false,
                        backdrop : true
                    },
                    modalData : {
                        modalId : 'sights-modal',
                        modalHeadline : Templater.i18n('sight_wizard'),
                        modalClose : Templater.i18n('wizard_close'),
                        modalNext : Templater.i18n('sight_add_photos'),
                        modalPrev : Templater.i18n('sights_edit_sight'),
                    }
                });

                this.sightModal
                    .render()
                    .setContentViews([this.sightFormView, this.pictureFormView]);

                this.sightModal.on('hide', function () {
                    that.router.navigate('sights');
                });

            }
        },
        
        createListView : function () {
            this.listView = new ListView({
                el : $('#sidebar'),
                template : tmplSightsList,
                listItemTemplate : tmplSightLink
            });

            this.listView.render();
        },

        createRouter : function () {
            this.router = new HofnahrrRouter();
        },

        addEventListeners : function () {

            this.collection.on('add', this.listView.onAdd);
            
            this.collection.on('reset', this.listView.onAddAll);
            
            this.sightFormView.on('create-sight', this.onCreateSight);

            this.fileDropView.on('drag-over', this.onFileDragOver);
            this.fileDropView.on('drag-end', this.onFileDragEnd);
            this.fileDropView.on('drop', this.onFileDragEnd);
            this.fileDropView.on('files-dropped', this.onFileDropped);


            this.router.on('route:open-sight', this.onOpenSight);

            this.router.on('route:edit-sight', this.onEditSight);

            this.router.on('route:create-new-sight', this.onCreateNewSight);

            this.router.on('route:login', this.onShowLogin);
            this.router.on('route:logout', this.onLogout);

        },

        onShowLogin : function () {
            var that = this;
            require(['views/login'], function (LoginView) {
                var loginView = new LoginView();
                $('body').append(loginView.render().el);
                loginView.on('login-user', that.onLogin);
                loginView.on('signup-user', that.onSignup);
            });
        },

        onLogin : function (data) {
            this.currentUser.login(data, {
                success : this.onUserLoggedIn
            });
        },

        onLogout : function (data) {
            this.currentUser.logout();
        },

        onSignup : function (data) {
            this.currentUser.signup(data);
        },

        onCreateNewSight : function () {
            this.selectedSight = null;
            this.createSightModal();
            this.sightFormView.setModel(null);
            this.pictureFormView.setModel(null);
            this.sightModal.show();
        },

        onOpenSight : function (id) {
            // TODO
            
        },

        onEditSight : function (id) {
            if (id) {
                this.selectedSight = this.collection.find(function (model) {
                    return id === model.get('speakingId');
                });
                if (this.selectedSight) {
                    this.createSightModal();
                    this.sightFormView.setModel(this.selectedSight);
                    this.pictureFormView.setModel(this.selectedSight);
                    this.sightModal.show();
                }
            }
        },

        onCreateSight : function (data) {
            var that = this;
            if (this.selectedSight) {
                this.selectedSight.save(data, {
                    success : function () {
                        that.sightFormView.render();
                    }
                });
            }
            else {
                this.collection.create(data, {
                    success : function () {
                        that.sightFormView.setModel(null);
                    }
                });
            }
        },


        start : function (isLoggedIn) {
            Backbone.history.start();
        },

        onUserLoggedIn : function () {
            this.collection.fetch({
                success : this.start
            });
        },
    };

    _.extend(AppController, Backbone.Events);

    return AppController;
    
});
