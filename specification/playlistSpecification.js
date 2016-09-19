const TrackSpecification = require('./trackSpecification.js');

/**
 * Specification for a Plex Playlist. It's primarily used as a persistable
 * intermediate class for construction a complete Playlist instance.
 */
class PlaylistSpecification {
  /**
  * @param {?Object} json A JSON object containing the necessary fields for
  *    constructing a playlist specification.
   * @param {?Element} element The playlist element that this specification
   *    represents.
   */
  constructor(json = null, element = null) {
    /**
     * @type {string}
     */
    this.title = element ?
        element.attributes.getNamedItem('title').value :
        json.title;

    /**
     * @type {string}
     */
    this.type = element ?
        element.attributes.getNamedItem('playlisttype').value :
        json.type;

    /**
     * @type {string}
     */
    this.key = element ?
        element.attributes.getNamedItem('key').value :
        json.key;

    /**
     * @type {number}
     */
    this.durationMillis = element ?
        Number(element.attributes.getNamedItem('duration').value) :
        json.durationMillis;

    /**
     * @type {string}
     */
    this.composite = element ?
        element.attributes.getNamedItem('composite').value :
        json.composite;

    /**
     * @type {!Array<!TrackSpecification>}
     */
    this.tracks = [];
    if (json && json.tracks && angular.isArray(json.tracks)) {
      this.tracks = json.tracks.map((jsonTrack) => {
        return new TrackSpecification(jsonTrack);
      });
    }
  }
}

module.exports = PlaylistSpecification;
