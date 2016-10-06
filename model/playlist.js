const PlaylistSpecification = require('../specification/playlistSpecification.js');
const TrackSpecification = require('../specification/trackSpecification.js');

/**
 * A model representing a Plex playlist.
 */
class Playlist {
  /**
   * @param {!PlaylistSpecification} specification
   */
  constructor(specification) {
    /**
     * @private {!PlaylistSpecification}
     */
    this.specification_ = specification;

    /**
     * @private {string}
     */
    this.thumbnailUrl_ = '';

    /**
     * @private {?Blob}
     */
    this.thumbnail_ = null;
  }

  /**
   * Returns the specification for this playlist.
   * @return {!PlaylistSpecification}
   */
  getSpecification() {
    return this.specification_;
  }

  /**
   * Returns the thumbnail blob for this playlist.
   * @return {?Blob}
   */
  getThumbnailUrl() {
    return this.thumbnailUrl_;
  }

  setThumbnail(imageData) {
    this.thumbnail_ = new Blob([imageData], {type: 'image/jpeg'});
    this.thumbnailUrl_ = URL.createObjectURL(this.thumbnail_);
  }

  /**
  <MediaContainer size="33" totalSize="33" composite="/playlists/30866/composite/1475035628" duration="6857" leafCount="33" offset="0" playlistType="audio" ratingKey="30866" smart="0" title="Alexander Music">
<Track ratingKey="32119" key="/library/metadata/32119" parentRatingKey="32118" grandparentRatingKey="8611" type="track" title="Frozen Heart" grandparentKey="/library/metadata/8611" parentKey="/library/metadata/32118" grandparentTitle="Various Artists" parentTitle="Frozen (Deluxe Edition)" originalTitle="Cast - Frozen" summary="" index="1" parentIndex="1" lastViewedAt="1459724923" thumb="/library/metadata/32118/thumb/1453344991" art="/library/metadata/8611/art/1474632830" parentThumb="/library/metadata/32118/thumb/1453344991" grandparentThumb="/library/metadata/8611/thumb/1474632830" grandparentArt="/library/metadata/8611/art/1474632830" playlistItemID="387" duration="105456" addedAt="1445570856" updatedAt="1445571288" chapterSource="">
<Media id="30512" duration="105456" bitrate="256" width="600" height="600" aspectRatio="1.33" audioChannels="2" audioCodec="mp3" videoCodec="mjpeg" container="mp3">
<Part id="31151" key="/library/parts/31151/1448735015/file.mp3" duration="105456" file="/mnt/DroboFS/Shares/Media/Music/Various Artists/Frozen (Deluxe Edition)/01-01- Frozen Heart.mp3" size="3788202" container="mp3" />

http://192.168.2.2:32400/library/metadata/32118/children?includeRelated=1&X-Plex-Product=Plex%20Web&X-Plex-Version=2.7.4&X-Plex-Client-Identifier=fk308o1pfusekv7slkyki6bt9&X-Plex-Platform=Chrome&X-Plex-Platform-Version=53.0&X-Plex-Device=OSX&X-Plex-Device-Name=Plex%20Web%20%28Chrome%29&X-Plex-Device-Screen-Resolution=1644x1240%2C2560x1440
</Media>
</Track>

   * Sets the tracks contained within this playlist based on a list of item
   * elements.
   * @param {!Array<!Element>} itemElements
   */
  setItemElements(itemElements) {
    const trackElements = itemElements.filter((element) => {
      return element.localName == 'track';
    });
    const mediaElements = itemElements.filter((element) => {
      return element.localName == 'media';
    });
    if (trackElements.length != mediaElements.length) {
      console.error('Expected an equal number of track and media elements.');
      this.specification_.tracks = [];
      return;
    }
    this.specification_.tracks = trackElements.map((trackElement, index) => {
      return new TrackSpecification(null, trackElement, mediaElements[index]);
    });
  }

  /**
   * Returns a list of file paths for this playlist's tracks.
   * @return {!Array<string>}
   */
  getTrackFilePaths() {
    return this.getSpecification().tracks.map((track) => {
      return track.filePath;
    });
  }
}

module.exports = Playlist;
