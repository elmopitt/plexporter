/**
 * Specification for a Plex Track.
 */
class TrackSpecification {
  /**
   * @param {?Object} json A JSON object containing the necessary fields for
   *    constructing a track specification.
   * @param {?Element} element The track element that this specification
   *    represents.
   * @param {?Element} element The media element corresponding to this track.
   */
  constructor(json = null, trackElement = null, mediaElement = null) {
    if (trackElement && !mediaElement) {
      const mediaCollection = trackElement.getElementsByTagName('media');
      if (mediaCollection && mediaCollection.length == 1) {
        console.log('Found inner media element for track.');
        mediaElement = mediaCollection.item(0);
      }
    }
    /**
     * @type {string}
     */
    this.title = (trackElement ?
        trackElement.attributes.getNamedItem('title').value :
        json.title) || '';

    /**
     * @type {string}
     */
    this.key = (trackElement ?
        trackElement.attributes.getNamedItem('key').value :
        json.key) || '';

    /**
     * @type {string}
     */
    this.albumKey = (trackElement ?
        trackElement.attributes.getNamedItem('parentKey').value :
        json.albumKey) || '';

    /**
     * @type {number}
     */
    this.durationMillis = (trackElement ?
        Number(trackElement.attributes.getNamedItem('duration').value) :
        json.durationMillis) || -1;

    /**
     * @type {string}
     */
    this.thumb = (trackElement ?
        (trackElement.attributes.getNamedItem('thumb') &&
            trackElement.attributes.getNamedItem('thumb').value) :
        json.durationMillis) || '';

    /**
     * @type {string}
     */
    this.filePath = mediaElement ?
        generateFilePath(mediaElement) : json.filePath;
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

module.exports = TrackSpecification;
