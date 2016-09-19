const ApplicationSettings = require('../specification/applicationSettings.js');
const ElectronEventService = require('./electron/eventService.js');
const Playlist = require('../model/playlist.js');
const PlaylistExportDialog = require('./playlistExportDialog.js');
const PlaylistSpecification = require('../specification/playlistSpecification.js');
const TrackSpecification = require('../specification/trackSpecification.js');

class PlexporterView {
  constructor($http, $mdDialog, electronEventService) {
    /**
     * @private
     */
    this.http_ = $http;

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

    this.electronEventService_.loadApplicationSettings().then(
        (applicationSettings) => {
          console.log('Loaded application settings:');
          console.log(applicationSettings);
          this.applicationSettings = applicationSettings;
          this.fetchPlaylists();
        });
  }

  fetchPlaylists() {
    if (!this.applicationSettings) {
      console.log('Skipping fetchPlaylists; application settings have not ' +
          'yet been loaded');
      return;
    }
    this.http_.get(
        this.applicationSettings.plexServerAddress + '/playlists/all')
    .then((response) => {
      const playlistElements = Array.from(
          angular.element(response.data).children('playlist'));
      console.log(playlistElements);
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

  findFilePathRoot(playlist) {
    return playlist.getSpecification().tracks.reduce((prefixSoFar, track) => {
      if (prefixSoFar == null) {
        return track.filePath;
      } else if (!prefixSoFar) {
        return prefixSoFar;
      } else if (track.filePath.startsWith(prefixSoFar)) {
        return prefixSoFar;
      }
      let i = 0;
      for (; i < prefixSoFar.length; i++) {
        if (prefixSoFar.charAt(i) != track.filePath.charAt(i)) {
          break;
        }
      }
      return prefixSoFar.substring(0, i);
    }, null);
  }

  exportFiles(playlist) {
    console.log('findFilePathRoot(): ' + this.findFilePathRoot(playlist));
    this.mdDialog_.show(PlaylistExportDialog.generateOptions())
        .then((response) => {
          console.log('Dialog has been closed:');
          console.log(response);
          console.log(JSON.stringify(playlist.getSpecification(), 2));
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
