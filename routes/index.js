var express = require("express");
var router = express.Router();
var Tracker = require("bittorrent-tracker");
var magnet = require("magnet-uri");
const WebTorrent = require("webtorrent");

/* GET home page. */
router.get("/", function (req, res, next) {
  res.json({ message: "Hello World" });
});

router.get("/scrape/:hash", (req, res) => {
  var torrentDetails = {};
  let infoHash = req.params.hash;
  let fetchData = req.query.fetchData;
  let suffix = "&tr=udp://tracker.opentrackr.org:1337/announce";
  let magnetURI = "magnet:?xt=urn:btih:" + infoHash + suffix;
  let parsedTorrent = magnet(magnetURI);

  let opts = {
    infoHash: parsedTorrent.infoHash,
    announce: parsedTorrent.announce,
    peerId: Buffer.from("foo_text"), // hex string or Buffer
    port: 6881, // torrent client port
  };
  try {
    var client = new Tracker(opts);
    const webtorrentClient = new WebTorrent();
    if (fetchData === "true") {
      webtorrentClient.add(magnetURI, (torrent) => {
        torrentDetails = {
          name: torrent.name,
          infoHash: torrent.infoHash,
          magnetURI: torrent.magnetURI,
          created: torrent.created,
          createdBy: torrent.createdBy,
          announce: torrent.announce,
          files: torrent.files.map((file) => ({
            name: file.name,
            size: file.length,
            path: file.path,
          })),
        };

        // Destroy the torrent after getting its metadata to prevent downloading it
        webtorrentClient.remove(magnetURI);
        client.scrape();

        client.on("scrape", function (results) {
          res.json({ ...results, ...torrentDetails });
        });
      });
    } else {
      client.scrape();

      client.on("scrape", function (results) {
        res.json({ ...results, ...torrentDetails });
      });
    }
  } catch {
    res.json({
      error: "Torrent cannot be found",
    });
  }
});

module.exports = router;
