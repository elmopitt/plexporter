const TrackSpecification = require('./trackSpecification.js');

/**
 * Specification for a Plex Album.
 */
class AlbumSpecification {
  /**
   * @param {?Object} json A JSON object containing the necessary fields for
   *    constructing an album specification.
   * @param {?Element} mediaContainerElement The album element that this
   *    specification represents.
   */
  constructor(json = null, mediaContainerElement = null) {
    /**
     * @type {string}
     */
    this.title = (mediaContainerElement ?
        mediaContainerElement.attributes.getNamedItem('parenttitle').value :
        json.title) || '';

    /**
     * @type {string}
     */
    this.key = (mediaContainerElement ?
        mediaContainerElement.attributes.getNamedItem('key').value :
        json.key) || '';

    /**
     * @type {!Array<!TrackSpecification>}
     */
    this.tracks = [];
    if (mediaContainerElement) {
      const trackCollection =
          mediaContainerElement.getElementsByTagName('track');
      const mediaCollection =
          mediaContainerElement.getElementsByTagName('media');
      if (trackCollection.length == mediaCollection.length) {
        for (let i = 0; i < trackCollection.length; i++) {
          const track = new TrackSpecification(
              null, trackCollection.item(i), mediaCollection.item(i));
          this.tracks.push(track);
        }
      } else {
        console.error('Media container had a different number of tracks and ' +
            'media.');
      }
    } else if (json && json.tracks && angular.isArray(json.tracks)) {
      this.tracks = json.tracks.map((jsonTrack) => {
        return new TrackSpecification(jsonTrack);
      });
    }
  }
}

/**
 * Generates the file path corresponding to the given media element, or the
 * empty string if no such path could be determined.
 * @param {!Element} mediaElement
 */
function generateFilePath(mediaElement) {
  if (mediaElement.children.length != 1) {
    console.error('Expected media to have a single part.');
    return '';
  }
  return mediaElement.children[0].attributes.getNamedItem('file').value || '';
}

module.exports = AlbumSpecification;
