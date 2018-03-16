/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
'use strict';
/* global enumerateStats */

function Call(config, test) {
  this.test = test;
  this.traceEvent = report.traceEventAsync('call');
  this.traceEvent({config: config});
  this.statsGatheringRunning = false;

  this.pc1 = new RTCPeerConnection(config);
  this.pc2 = new RTCPeerConnection(config);

  this.pc1.addEventListener('icecandidate', this.onIceCandidate_.bind(this,
      this.pc2));
  this.pc2.addEventListener('icecandidate', this.onIceCandidate_.bind(this,
      this.pc1));

  this.iceCandidateFilter_ = Call.noFilter;
}

Call.prototype = {
  establishConnection: function() {
    this.traceEvent({state: 'start'});
    this.pc1.createOffer().then(
        this.gotOffer_.bind(this),
        this.test.reportFatal.bind(this.test)
    );
  },

  close: function() {
    this.traceEvent({state: 'end'});
    this.pc1.close();
    this.pc2.close();
  },

  setIceCandidateFilter: function(filter) {
    this.iceCandidateFilter_ = filter;
  },

  // Constraint max video bitrate by modifying the SDP when creating an answer.
  constrainVideoBitrate: function(maxVideoBitrateKbps) {
    this.constrainVideoBitrateKbps_ = maxVideoBitrateKbps;
  },

  // Remove video FEC if available on the offer.
  disableVideoFec: function() {
    this.constrainOfferToRemoveVideoFec_ = true;
  },

  // When the peerConnection is closed the statsCb is called once with an array
  // of gathered stats.
  gatherStats: function(peerConnection,peerConnection2, localStream, statsCb) {
    var stats = [];
    var stats2 = [];
    var statsCollectTime = [];
    var statsCollectTime2 = [];
    var self = this;
    var statStepMs = 100;
    self.localTrackIds = {
      audio: '',
      video: ''
    };
    self.remoteTrackIds = {
      audio: '',
      video: ''
    };

    peerConnection.getSenders().forEach(function(sender) {
      if (sender.track.kind === 'audio') {
        self.localTrackIds.audio = sender.track.id;
      } else if (sender.track.kind === 'video') {
        self.localTrackIds.video = sender.track.id;
      }
    }.bind(self));

    if (peerConnection2) {
      peerConnection2.getReceivers().forEach(function(receiver) {
        if (receiver.track.kind === 'audio') {
          self.remoteTrackIds.audio = receiver.track.id;
        } else if (receiver.track.kind === 'video') {
          self.remoteTrackIds.video = receiver.track.id;
        }
      }.bind(self));
    }

    this.statsGatheringRunning = true;
    getStats_();

    function getStats_() {
      if (peerConnection.signalingState === 'closed') {
        self.statsGatheringRunning = false;
        statsCb(stats, statsCollectTime, stats2, statsCollectTime2);
        return;
      }
      peerConnection.getStats()
          .then(gotStats_)
          .catch(function(error) {
            self.test.reportError('Could not gather stats: ' + error);
            self.statsGatheringRunning = false;
            statsCb(stats, statsCollectTime);
          }.bind(self));
      if (peerConnection2) {
        peerConnection2.getStats()
            .then(gotStats2_);
      }
    }
    // Stats for pc2, some stats are only available on the receiving end of a
    // peerconnection.
    function gotStats2_(response) {
      if (adapter.browserDetails.browser === 'chrome') {
        var enumeratedStats = enumerateStats(response, self.localTrackIds,
            self.remoteTrackIds);
        stats2.push(enumeratedStats);
        statsCollectTime2.push(Date.now());
      } else if (adapter.browserDetails.browser === 'firefox') {
        for (var h in response) {
          var stat = response[h];
          stats2.push(stat);
          statsCollectTime2.push(Date.now());
        }
      } else {
        self.test.reportError('Only Firefox and Chrome getStats ' +
            'implementations are supported.');
      }
    }

    function gotStats_(response) {
      // TODO: Remove browser specific stats gathering hack once adapter.js or
      // browsers converge on a standard.
      if (adapter.browserDetails.browser === 'chrome') {
        var enumeratedStats = enumerateStats(response, self.localTrackIds,
            self.remoteTrackIds);
        stats.push(enumeratedStats);
        statsCollectTime.push(Date.now());
      } else if (adapter.browserDetails.browser === 'firefox') {
        for (var j in response) {
          var stat = response[j];
          stats.push(stat);
          statsCollectTime.push(Date.now());
        }
      } else {
        self.test.reportError('Only Firefox and Chrome getStats ' +
            'implementations are supported.');
      }
      setTimeout(getStats_, statStepMs);
    }
  },

  gotOffer_: function(offer) {
    if (this.constrainOfferToRemoveVideoFec_) {
      offer.sdp = offer.sdp.replace(/(m=video 1 [^\r]+)(116 117)(\r\n)/g,
          '$1\r\n');
      offer.sdp = offer.sdp.replace(/a=rtpmap:116 red\/90000\r\n/g, '');
      offer.sdp = offer.sdp.replace(/a=rtpmap:117 ulpfec\/90000\r\n/g, '');
      offer.sdp = offer.sdp.replace(/a=rtpmap:98 rtx\/90000\r\n/g, '');
      offer.sdp = offer.sdp.replace(/a=fmtp:98 apt=116\r\n/g, '');
    }
    this.pc1.setLocalDescription(offer);
    this.pc2.setRemoteDescription(offer);
    this.pc2.createAnswer().then(
        this.gotAnswer_.bind(this),
        this.test.reportFatal.bind(this.test)
    );
  },

  gotAnswer_: function(answer) {
    if (this.constrainVideoBitrateKbps_) {
      answer.sdp = answer.sdp.replace(
          /a=mid:video\r\n/g,
          'a=mid:video\r\nb=AS:' + this.constrainVideoBitrateKbps_ + '\r\n');
    }
    this.pc2.setLocalDescription(answer);
    this.pc1.setRemoteDescription(answer);
  },

  onIceCandidate_: function(otherPeer, event) {
    if (event.candidate) {
      var parsed = Call.parseCandidate(event.candidate.candidate);
      if (this.iceCandidateFilter_(parsed)) {
        otherPeer.addIceCandidate(event.candidate);
      }
    }
  }
};

Call.noFilter = function() {
  return true;
};

Call.isRelay = function(candidate) {
  return candidate.type === 'relay';
};

Call.isNotHostCandidate = function(candidate) {
  return candidate.type !== 'host';
};

Call.isReflexive = function(candidate) {
  return candidate.type === 'srflx';
};

Call.isHost = function(candidate) {
  return candidate.type === 'host';
};

Call.isIpv6 = function(candidate) {
  return candidate.address.indexOf(':') !== -1;
};

// Parse a 'candidate:' line into a JSON object.
Call.parseCandidate = function(text) {
  var candidateStr = 'candidate:';
  var pos = text.indexOf(candidateStr) + candidateStr.length;
  var fields = text.substr(pos).split(' ');
  return {
    'type': fields[7],
    'protocol': fields[2],
    'address': fields[4]
  };
};

// Store the ICE server response from the network traversal server.
Call.cachedIceServers_ = null;
// Keep track of when the request was made.
Call.cachedIceConfigFetchTime_ = null;

// Get a TURN config
Call.asyncCreateTurnConfig = function(onSuccess, onError) {
  var settings = currentTest.settings;
  var iceServer = {};
  if (typeof(settings.turnURI) === 'string' && settings.turnURI !== '') {
    iceServer = {
      'username': settings.turnUsername || '',
      'credential': settings.turnCredential || '',
      'urls': settings.turnURI.split(',')
    };
  } else if (typeof(TURN_URL) === 'string' && TURN_URL !== '') {
    iceServer = {
      'username': TURN_USERNAME || '',
      'credential': TURN_CREDENTIAL || '',
      'urls': TURN_URL.split(',')
    };
  } else {
    onError('TURN request failed');
    return;
  }
  var config = {'iceServers': [iceServer]};
  report.traceEventInstant('turn-config', config);
  setTimeout(onSuccess.bind(null, config), 0);
};

// Get a STUN config
Call.asyncCreateStunConfig = function(onSuccess, onError) {
  var settings = currentTest.settings;
  var iceServer = {};
  if (typeof(settings.stunURI) === 'string' && settings.stunURI !== '') {
    iceServer = {
      'urls': settings.stunURI.split(',')
    };
  } else if (typeof(STUN_URL) === 'string' && STUN_URL !== '') {
    iceServer = {
      'urls': STUN_URL.split(',')
    };
  } else {
    onError('STUN request failed');
    return;
  }
  var config = {'iceServers': [iceServer]};
  report.traceEventInstant('stun-config', config);
  setTimeout(onSuccess.bind(null, config), 0);
};
