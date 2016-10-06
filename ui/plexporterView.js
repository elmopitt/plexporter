const AlbumSpecification = require('../specification/albumSpecification.js');
const ApplicationSettings = require('../specification/applicationSettings.js');
const ElectronEventService = require('./electron/eventService.js');
const ExportSettings = require('../specification/exportSettings.js');
const Playlist = require('../model/playlist.js');
const PlaylistExportDialog = require('./playlistExportDialog.js');
const PlaylistSpecification = require('../specification/playlistSpecification.js');
const ResponseChannel = require('../event/responseChannel.js');
const TrackSpecification = require('../specification/trackSpecification.js');

class PlexporterView {
  constructor($scope, $http, $q, $mdDialog, electronEventService) {
    /**
     * @private
     */
    this.http_ = $http;

    /**
     * @private
     */
    this.q_ = $q;

    /**
     * @private
     */
    this.mdDialog_ = $mdDialog;

    /**
     * @private {!ElectronEventService}
     */
    this.electronEventService_ = electronEventService;

    /**
     * @package {?ApplicationSettings}
     */
    this.applicationSettings = null;

    /**
     * @package {!Tab}
     */
    this.selectedTab = Tab.PLAYLISTS;

    /**
     * @package {!Array<Playlist>}
     */
    this.playlists = [];

    /**
     * @private {string}
     */
    this.thumbnailParams_ =
        '?width=100&height=100&rows=2&cols=2&border=0&media=thumb&repeat=1';

    /**
     * @private {!Object}
     */
    this.THUMBNAIL_CONFIG_ = {
      'responseType': 'arraybuffer',
    };

    /**
     * @package {?string}
     */
    this.currentOperationName = null;

    /**
     * @package {?number}
     */
    this.currentOperationPercentage = null;

    this.electronEventService_.loadApplicationSettings().then(
        (applicationSettings) => {
          this.applicationSettings = applicationSettings;
          this.fetchPlaylists();
        });

    $scope.$on(ResponseChannel.PROGRESS_UPDATE, (event, progressPercentage) => {
      this.currentOperationPercentage = progressPercentage;
    });
  }

  fetchPlaylists() {
    if (!this.applicationSettings) {
      return;
    }
    this.http_.get(
        this.applicationSettings.plexServerAddress + '/playlists/all')
    .then((response) => {
      const playlistElements = Array.from(
          angular.element(response.data).children('playlist'));
      this.playlists = playlistElements.map((element) => {
        return new Playlist(
            new PlaylistSpecification(null, element));
      }).filter((playlist) => {
        return playlist.getSpecification().type == 'audio';
      });
      this.playlists.forEach((playlist) => {
        this.http_.get(
            this.generateThumbnailUrl(playlist), this.THUMBNAIL_CONFIG_)
        .then((thumbnailResponse) => {
          playlist.setThumbnail(thumbnailResponse.data);
        }, (thumbnailError) => {
          console.error(thumbnailError);
        });
        this.http_.get(this.applicationSettings.plexServerAddress +
            playlist.getSpecification().key)
        .then((itemsResponse) => {
          const itemElements = Array.from(
              angular.element(itemsResponse.data).children());
          playlist.setItemElements(itemElements);
        }, (itemsError) => {
          console.error(itemsError);
        });
      });
    }, (error) => {
      console.error(error);
    });
  }

  generateThumbnailUrl(playlist) {
    return this.applicationSettings.plexServerAddress +
        playlist.getSpecification().composite +
        this.thumbnailParams_;
  }

  exportFiles(playlist) {
    if (this.isOperationInProgress()) {
      return;
    }
    this.mdDialog_.show(PlaylistExportDialog.generateOptions())
        .then((exportSettings) => {
          if (exportSettings.copyFiles) {
            this.electronEventService_.selectExistingDirectory()
                .then((directory) => {
                  if (exportSettings.includeAlbum) {
                    const albumKeySet = new Set();
                    for (const track of playlist.getSpecification().tracks) {
                      if (!track.albumKey) {
                        console.log('No album key for track:');
                        console.log(track);
                      } else {
                        albumKeySet.add(track.albumKey);
                      }
                    }
                    const albumPromises = [...albumKeySet].map((albumKey) => {
                      return this.http_.get(
                          this.applicationSettings.plexServerAddress +
                              albumKey + '/children')
                          .then(
                            (response) => {
                              const albumResponse =
                                  angular.element(response.data);
                              const mediaContainerElement =
                                  Array.from(albumResponse).find((element) => {
                                    return element.localName == 'mediacontainer';
                                  });
                              const album = new AlbumSpecification(
                                  null, mediaContainerElement);
                              return album;
                            },
                            (error) => {
                              console.error('Failed to get album tracks: ' +
                                  error);
                            });
                    });
                    this.q_.all(albumPromises).then(
                      (albums) => {
                        this.currentOperationName = 'Copying albums';
                        this.currentOperationPercentage = null;
                        this.electronEventService_.copyAlbums(
                            albums,
                            directory,
                            this.applicationSettings.localMediaPaths).then(
                              () => {
                                console.log('copyAlbums was successful.');
                                this.currentOperationName = null;
                                this.currentOperationPercentage = null;
                              },
                              (error) => {
                                console.error('copyAlbums failed:');
                                console.error(error);
                                this.currentOperationName = null;
                                this.currentOperationPercentage = null;
                              });
                      },
                      (error) => {
                        console.error('Error generating list of albums from ' +
                            'tracks:');
                        console.error(error);
                      }
                    )
                  } else {
                    this.currentOperationName = 'Copying tracks';
                    this.currentOperationPercentage = null;
                    this.electronEventService_.copyTracks(
                        playlist.getSpecification(),
                        directory,
                        this.applicationSettings.localMediaPaths).then(
                          () => {
                            this.currentOperationName = null;
                            this.currentOperationPercentage = null;
                          },
                          (error) => {
                            console.error('copyFiles failed:');
                            console.error(error);
                            this.currentOperationName = null;
                            this.currentOperationPercentage = null;
                          });
                  }
            });
          } else {
            const alertPreset = this.mdDialog_.alert()
                .textContent('Exporting files is not yet supported.');
            this.mdDialog_.show(alertPreset);
          }
        });
  }

  saveApplicationSettings() {
    if (!this.applicationSettings) {
      throw Error('Application settings have not yet been loaded.');
    }
    this.electronEventService_
        .saveApplicationSettings(this.applicationSettings)
        .then(
            () => {
              console.log('Application settings saved successfully.');
            },
            () => {
              console.log('Application settings failed to save.');
            });
  }

  addLocalPath() {
    if (!this.applicationSettings) {
      throw Error('Application settings have not yet been loaded.');
    }
    this.electronEventService_
        .selectExistingDirectory()
        .then(
            (selectedDirectory) => {
              this.applicationSettings.localMediaPaths.push(selectedDirectory);
            },
            () => {
              console.log('Failed to select a directory.');
            });
  }

  /**
   * Returns whether an operation is currently in progress.
   * @return {boolean}
   */
  isOperationInProgress() {
    return this.currentOperationName != null;
  }
}

/**
 * @enum {number}
 */
Tab = {
  PLAYLISTS: 0,
  SETTINGS: 1,
}

PlexporterView.COMPONENT_NAME = 'plexporterView';

PlexporterView.COMPONENT = {
  controller: PlexporterView,
  templateUrl: 'ui/plexporterView.html'
};

module.exports = PlexporterView;
