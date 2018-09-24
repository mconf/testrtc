/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
/* exported testCaseName */
'use strict';

/*  In order to make strings easier to translate all test case names should be
 *  added here.
 *  TODO: Add/create new file containing the remainder of strings like error
 *  messages and general information.
 */

// Enumerate test case names.
function TestCaseNames() {
  this.testCases = {
    AUDIOCAPTURE: 'Captura de áudio',
    CHECKRESOLUTION240: 'Verificar resolução 320x240',
    CHECKRESOLUTION480: 'Verificar resolução 640x480',
    CHECKRESOLUTION720: 'Verificar resolução 1280x720',
    CHECKSUPPORTEDRESOLUTIONS: 'Verificar resoluções suportadas',
    DATATHROUGHPUT: 'Vazão de dados',
    IPV6ENABLED: 'IPv6 habilitado',
    NETWORKLATENCY: 'Latência de rede',
    NETWORKLATENCYRELAY: 'Latência de rede - Retransmissão',
    UDPENABLED: 'UDP habilitado',
    TCPENABLED: 'TCP habilitado',
    VIDEOBANDWIDTH: 'Taxa de transmissão de vídeo',
    RELAYCONNECTIVITY: 'Conectividade de Retransmissão',
    REFLEXIVECONNECTIVITY: 'Conectividade de Reflexão',
    HOSTCONNECTIVITY: 'Conectividade de host'
  };
  return this.testCases;
}

var testCaseName = new TestCaseNames();
