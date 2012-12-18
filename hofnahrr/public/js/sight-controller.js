/*global define*/
define([
    'underscore', 'backbone', 
    'templater',

    'collections/sight-collection',
    'models/sight',
    'models/file',
    'user-access-handler',

    'settings',

    'views/sight-nav',
    'views/sight-list',
    'views/sight-info',
    'views/template',
    'views/templated-bridge',
    'views/file-drop',
    'views/sight-modal',
    'views/sight-map',
    'views/sight-mosaic',
    'views/sight-gallery',
    'views/sight-form',
    'views/picture-form',

    'text!layout/sight.html',
    'text!tmpl/sight-nav.tmpl',
    'text!tmpl/sight-info.tmpl',
    'text!tmpl/sights-list.tmpl',
    'text!tmpl/sight-link.tmpl',
    'text!tmpl/sight-manager.tmpl',
    'text!tmpl/sight-list-entry.tmpl',
    'text!tmpl/upload.tmpl',
    'text!tmpl/image.tmpl',
    'text!tmpl/picture-form.tmpl',
], function (
    _, Backbone, Templater,
    
    SightCollection,
    SightModel, 
    FileModel,
    UserAccessHandler,

    settings,

    SightNavView,
    SightListView, 
    SightInfoView,
    TemplateView,
    TemplatedBridgeView,
    FileDropView,
    ModalView,
    SightMapView,
    SightMosaicView,
    SightGalleryView,
    SightFormView,
    PictureFormView,

    tmplSightLayout,
    tmplSightNav,
    tmplSightInfo,
    tmplSightsList, tmplSightLink,
    tmplSightModal, 
    tmplSightNavListItem,
    tmplUpload, 
    tmplImage,
    tmplPictureForm
) {
    'use strict';

    var SightController;

    SightController = {
        init : function () {
            _.bindAll(this, 
                    'onEditSight', 
                    'onOpenSight', 
                    'onOpenSightInfo', 
                    'onOpenSightMap', 
                    'onOpenSightGallery', 
                    'onOpenSightMosaic', 
                    'onCreateSight', 
                    'onDeleteSight',
                    'onCreateNewSight', 
                    'onShowSightMap', 
                    'onFileRead',
                    'initSightLayout',
                    'onAddPicturesToSight', 
                    'onRemovePicturesFromSight', 
                    'onEditPicturesOfSight',
                    'onOpenContainer', 
                    'onNewContainer',
                    'onSearch', 
                    'onPickOnMap', 
                    'onMakeCover');


            // no sight is selected now
            this.selectedSight = null;

            this.createSightViews();

            this.createSightCollection();

            this._sightControllerInstalled = true;
            this.layouts.sight = tmplSightLayout;

            this._openedPage = '';

            this.sightCollection.fetch({
                success : this.start
            });

            this.on('layout-set:sight', this.initSightLayout);
        },

        onSearch : function (path, query) {
            this.listView.filter(query);
        },

        createSightViews : function () {
            this.createSightSecondaryNavView();
            this.createSightListView();
            this.createSightInfoView();
            this.createSightMapView();
            this.createSightMosaicView();
            this.createSightGalleryView();
        },

        createSightCollection : function () {
            // create a new Sight Collection
            this.sightCollection = new SightCollection();
            this.sightCollection.model = SightModel;
            this.sightCollection.url = settings.API.SIGHTS;

            // sight collection events
            this.sightCollection.on('add', this.listView.onAdd);
            this.sightCollection.on('reset', this.listView.onAddAll);
        },

        createSightSecondaryNavView : function () {
            var data = {}; 

            if (this.selectedSight) {
                data = this.selectedSight.toJSON();
            }

            this.sightNav = new SightNavView({
                template : tmplSightNav
            })
            .render();
        },

        createSightInfoView : function () {
            this.sightInfoView = new SightInfoView({
                tagName : 'div',
                className : 'container-fluid padded',
                template : tmplSightInfo
            });
        },

        createSightMapView : function () {
            this.sightMapView = new SightMapView();
        },

        createSightMosaicView : function () {
            this.sightMosaicView = new SightMosaicView();
        },

        createSightGalleryView : function () {
            this.sightGalleryView = new SightGalleryView();
        },

        createSightListView : function () {
            this.listView = new SightListView({
                template : tmplSightsList,
                listItemTemplate : tmplSightLink
            }).render();
        },

        appendSightListView : function () {
            $('#sidebar').empty().append(this.listView.el);
        },

        onOpenSight : function (id) {
            this.onOpenSightMap(id);        
        },

        onOpenSightInfo : function (id) {
            this.sightSubpage = 'info/';
            this.openSightView(id, this.sightInfoView);
        },

        onOpenSightMap : function (id) {
            this.sightSubpage = 'map/';
            this.openSightView(id, this.sightMapView, {
                silent : this.mainView === this.sightMapView, 
                collection : true
            });
        },

        onOpenSightGallery : function (id) {
            this.sightSubpage = 'gallery/';
            this.openSightView(id, this.sightGalleryView);
        },

        onOpenSightMosaic : function (id) {
            this.sightSubpage = 'mosaic/';
            this.openSightView(id, this.sightMosaicView);
        },

        onShowSightMap : function () {
            this.onOpenSightMap();
        },

        openSightView : function (sightId, view, options) {
            options || (options = {});

            this.setLayout('sight');

            this.setSelectedSight(sightId, {
                randomize : typeof options.randomize !== 'undefined' ? 
                    options.randomize :
                    true
            });
            
            if (!options.noSubpage) {
                this.listView
                    .setSubPage(this.sightSubpage)
                    .setSight(this.selectedSight && this.selectedSight.get('speakingId'));
            }

            // only update main view, if it's actually a different view or if
            // the silent option was not set
            if (this.currentView !== view || !options.silent) {
                this.setMainView(view);
            }
            this.currentView = view;

            // provide views that require a collection for rendering with said
            // collection
            if (options.collection) {
                view.setCollection(this.sightCollection);
            }

            view.setModel(this.selectedSight);


            if (!options.noSubpage) {
                this.sightNav.openPage(this.sightSubpage);
            }
        },

        initSightLayout : function () {
            $('body').addClass('lilac');
            this.appendSightListView();
            this.appendSecondaryNavView(this.sightNav);
        },

        setSelectedSight : function (id, options) {
            options || (options = {});
            if (id) {
                this.selectedSight = this.sightCollection.find(function (model) {
                    return id === model.get('speakingId');
                });
            }
            else {
                if (options.randomize) {
                    var rnd = parseInt(Math.random() * 
                                       this.sightCollection.length, 10);
                    this.selectedSight = this.sightCollection.at(rnd);
                }
                else {
                    this.selectedSight = null;
                }
            }
            this.sightNav.setModel(this.selectedSight);
        },

        onEditSight : function (id) {
            if (UserAccessHandler.may('edit_sight', this.currentUser)) {
                this.setSelectedSight(id);
                if (this.selectedSight) {
                    this.openModal(this.selectedSight);
                }
            }
            else {
                this.trigger('login-required');
            }
        },

        onCreateNewSight : function () {
            this.setSelectedSight(null);
            this.openModal(null);
        },

        openModal : function (sight) {
            this.createSightModal();
            this.sightModal.setModel(sight);
            this.sightModal.modal.show();
        },

        onCreateSight : function (data) {
            var that = this, sight;
            if (data.id) {
                sight = this.sightCollection.get(data.id);
                if (sight) {
                    sight.save(data, {
                        success : function () {
                            that.sightFormView.render();
                        }
                    });
                }
            }
            else {
                this.sightCollection.create(data, {
                    success : function () {
                        that.sightFormView.setModel(null);
                    }
                });
            }
        },

        onDeleteSight : function (id) {
            if (window.confirm(Templater.i18n('sight_confirm_delete'))) {
                var sight = this.sightCollection.get(id);
                sight.destroy();
            }
        },

        createSightModal : function () {
            var that = this,
                sightModal;

            if (!this.sightModal) {
                sightModal = new ModalView({
                    el : 'body',
                    template : tmplSightModal,
                    listItemTemplate : tmplSightNavListItem,
                    modalOptions : {
                        show : false,
                        backdrop : true
                    },
                    modalData : {
                        modalId : 'sights-modal',
                        modalHeadline : Templater.i18n('sight_manager'),
                        modalClose : Templater.i18n('modal_close'),
                        modalNext : Templater.i18n('sight_add_photos'),
                        modalPrev : Templater.i18n('sights_edit_sight'),
                        unknownModelId : this.sightCollection.unknownModel.id
                    }
                });

                this.sightModal = sightModal;
                this.createSightFormView();
                this.createFileDropView();


                sightModal
                    .render()
                    .setContentViews([{
                        view : this.sightFormView,
                        trigger : 'click .show-sight-form',
                        className : 'large'
                    }, {
                        view : this.fileDropView,
                        trigger : 'click .show-file-browser',
                        className : 'wide'
                    }]);


                sightModal.on('add-items-to-container', this.onAddPicturesToSight);
                sightModal.on('open-container', this.onOpenContainer);
                sightModal.on('new-container', this.onNewContainer);
                sightModal.modal.on('hide', function () {
                    that.router.navigate('sight/');
                });

                this.sightCollection.on('add', sightModal.onAdd);
                this.sightCollection.on('reset', sightModal.onAddAll);
                sightModal.onAddAll(this.sightCollection);

            }
        },

        createSightFormView : function () {
            // early return if view exists already
            if (this.sightFormView) {
                return;
            }

            this.sightFormView = new SightFormView();
            // sight form events
            this.sightFormView.on('create-sight', this.onCreateSight);
            this.sightFormView.on('delete-sight', this.onDeleteSight);
            this.sightFormView.on('pick-on-map', this.onPickOnMap);
        },

        createFileDropView : function () {
            this.fileDropView = new FileDropView({
                tagName : 'div',
                template : tmplUpload,
                fileTemplate : tmplImage,
                fileEditTemplate : tmplPictureForm,
                modelFileListProperty : 'pictures'
            });
            this.fileDropView.on('remove-item-from-container', this.onRemovePicturesFromSight);
            this.fileDropView.on('files-edited', this.onEditPicturesOfSight);
            this.fileDropView.on('file-read', this.onFileRead);
            this.fileDropView.on('make-cover', this.onMakeCover);
        },

        onMakeCover : function (picture, sightId) {
            var sight = this.sightCollection.get(sightId);
            sight.save({icon : picture});
        },

        onFileRead : function (file, containerId) {
            var sight = this.sightCollection.get(containerId),
                fileModel = new FileModel();

            fileModel.url = settings.BASE_URL + settings.API.PICTURES + file.name;

            this.fileDropView.addUploadFile(fileModel);

            fileModel.on('upload-succeeded', function (attrs) {
                sight.addImage(attrs);
            });

            fileModel.upload(file);
        },

        onAddPicturesToSight : function (pictures, sightId) {
            var sight = this.sightCollection.get(sightId);
            if (pictures && sight) {
                _.each(pictures, function (pictures) {
                    sight.addImage(pictures);
                });
            }
        },

        onRemovePicturesFromSight : function (pictureId, sightId) {
            var sight = this.sightCollection.get(sightId);
            if (pictureId && sight) {
                sight.removeImage(pictureId, {
                    success : function () {
                        console.log('SUCCESS: TODO'); 
                    }
                });
            }
        },

        onEditPicturesOfSight : function (data, fileIds, sightId) {
            var sight = this.sightCollection.get(sightId);
            if (sight) {
                sight.editImages(fileIds, data, {
                    success : function () {
                        console.log('SUCCESS: TODO'); 
                    }
                });
            }
        },

        onOpenContainer : function (containerId) {
            var sight = this.sightCollection.get(containerId); 
            if (sight) {
                this.sightModal.setModel(sight);
            }
            if (containerId === '-1') {
                this.sightModal.openContentView(1);
            }
        },

        onNewContainer : function () {
            var sight = this.sightCollection.create(); 
            if (sight) {
                this.sightModal.setModel(sight);
            }
        },

        onPickOnMap : function (onPick, onCancel) {
            // open map sight
            var that = this,
                modal = this.sightModal.modal,
                sightMapView = this.sightMapView,
                oldView = this.currentView,
                onReady = function () {
                    sightMapView.off('map-ready', onReady);

                    sightMapView.preparePicker()
                        .on('pick', function (location) {
                            onPick(location);
                        })
                        .on('picked', function () {
                            sightMapView.destroyPicker();
                            if (oldView && that.currentView !== oldView) {
                                that.setMainView(oldView);
                            }
                            that.currentView = oldView;
                            modal.show();
                        })
                        .on('cancel', function (location) {
                            sightMapView.destroyPicker();
                            onCancel();
                            if (oldView && that.currentView !== oldView) {
                                that.setMainView(oldView);
                            }
                            that.currentView = oldView;
                            modal.show();
                        });

                };

            modal.minimize();
            if (this.currentView === sightMapView) {
                onReady();
            }
            else {
                sightMapView.on('map-ready', onReady);
            }

            this.openSightView(null, sightMapView, {
                silent : true, 
                collection : true,
                randomize : false,
                noSubpage : true
            });

        },


    };

    return {
        installTo : function (target) {
            _.extend(target, SightController);
            SightController.init.apply(target);
        }
    };
});
