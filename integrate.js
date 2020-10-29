/*
 * Copyright 2020 Jiří Janoušek <janousek.jiri@gmail.com>
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

'use strict';

(function (Nuvola) {
  // Create media player component
  var player = Nuvola.$object(Nuvola.MediaPlayer)

  // Handy aliases
  var PlaybackState = Nuvola.PlaybackState
  var PlayerAction = Nuvola.PlayerAction

  // Create new WebApp prototype
  var WebApp = Nuvola.$WebApp()

  // Initialization routines
  WebApp._onInitWebWorker = function (emitter) {
    Nuvola.WebApp._onInitWebWorker.call(this, emitter)

    var state = document.readyState
    if (state === 'interactive' || state === 'complete') {
      this._onPageReady()
    } else {
      document.addEventListener('DOMContentLoaded', this._onPageReady.bind(this))
    }
  }

  // Page is ready for magic
  WebApp._onPageReady = function () {
    // Connect handler for signal ActionActivated
    Nuvola.actions.connect('ActionActivated', this)

    // Start update routine
    this.update()
  }

  // Extract data from the web page
  WebApp.update = function () {
    var elms = this._getElements()
    var track = {
      title: Nuvola.queryText('.mainPlayer #stitle'),
      artist: null,
      album: Nuvola.queryText('.mainPlayer #atitle'),
      artLocation: Nuvola.queryAttribute('.mainPlayer .player-artwork img', 'src'),
      rating: null,
      length: elms.totalTime ? elms.totalTime.textContent.trim() || null : null
    }

    var state
    if (elms.pause) {
      state = PlaybackState.PLAYING
    } else if (elms.play) {
      state = PlaybackState.PAUSED
    } else {
      state = PlaybackState.UNKNOWN
    }

    player.setPlaybackState(state)
    player.setTrack(track)

    player.setCanGoPrev(!!elms.prev)
    player.setCanGoNext(!!elms.next)
    player.setCanPlay(!!elms.play)
    player.setCanPause(!!elms.pause)

    player.setTrackPosition(elms.elapsedTime ? elms.elapsedTime.textContent.trim() || null : null)
    player.setCanSeek(state !== PlaybackState.UNKNOWN && elms.progressbar)

    var volume = elms.volumebar && elms.volumebar.firstElementChild && elms.volumebar.firstElementChild.style.height
    player.updateVolume(volume && volume.endsWith('%') ? volume.replace('%', '') / 100 : null)
    player.setCanChangeVolume(!!elms.volumebar)

    var shuffle = elms.shuffle ? elms.shuffle.classList.contains('on') : null
    player.setCanShuffle(shuffle !== null)
    player.setShuffleState(shuffle)

    var repeat = this._getRepeat(elms)
    player.setCanRepeat(repeat !== null)
    player.setRepeatState(repeat)

    // Schedule the next update
    setTimeout(this.update.bind(this), 500)
  }

  // Handler of playback actions
  WebApp._onActionActivated = function (emitter, name, param) {
    var elms = this._getElements()
    switch (name) {
      case PlayerAction.TOGGLE_PLAY:
        if (elms.play) {
          Nuvola.clickOnElement(elms.play)
        } else {
          Nuvola.clickOnElement(elms.pause)
        }
        break
      case PlayerAction.PLAY:
        Nuvola.clickOnElement(elms.play)
        break
      case PlayerAction.PAUSE:
      case PlayerAction.STOP:
        Nuvola.clickOnElement(elms.pause)
        break
      case PlayerAction.PREV_SONG:
        Nuvola.clickOnElement(elms.prev)
        break
      case PlayerAction.NEXT_SONG:
        Nuvola.clickOnElement(elms.next)
        break
      case PlayerAction.SEEK:
        var total = elms.totalTime ? Nuvola.parseTimeUsec(elms.totalTime.textContent.trim()) || null : null
        if (total && param > 0 && param <= total) {
          Nuvola.clickOnElement(elms.progressbar, param / total, 0.5)
        }
        break
      case PlayerAction.CHANGE_VOLUME:
        elms.volumebar.parentNode.style.display = 'block'
        Nuvola.clickOnElement(elms.volumebar, 0.5, 1 - param)
        elms.volumebar.parentNode.style.display = null
        break
      case PlayerAction.SHUFFLE:
        Nuvola.clickOnElement(elms.shuffle)
        break
      case PlayerAction.REPEAT:
        this._setRepeat(elms, param)
        break
    }
  }

  WebApp._getElements = function () {
    // Interesting elements
    var elms = {
      play: document.querySelector('.mainPlayer .play-song.play'),
      pause: document.querySelector('.mainPlayer .play-song.pause'),
      next: document.querySelector('.mainPlayer .next-song.enabled'),
      prev: document.querySelector('.mainPlayer .prev-song.enabled'),
      repeat: document.querySelector('.mainPlayer .repeat.enabled'),
      shuffle: document.querySelector('.mainPlayer .shuffle.enabled'),
      progressbar: document.querySelector('.mainPlayer .songseek.seekbar'),
      volumebar: document.querySelector('.mainPlayer .volumeseek.seekbar'),
      elapsedTime: document.querySelector('.mainPlayer .timer.mq'),
      totalTime: document.querySelector('.mainPlayer .timer.ttime')
    }
    return elms
  }

  WebApp._getRepeat = function (elms) {
    if (!elms.repeat) {
      return null
    }
    if (elms.repeat.classList.contains('repeatOne')) {
      return Nuvola.PlayerRepeat.TRACK
    }
    return elms.repeat.classList.contains('repeatAll') ? Nuvola.PlayerRepeat.PLAYLIST : Nuvola.PlayerRepeat.NONE
  }

  WebApp._setRepeat = function (elms, repeat) {
    while (this._getRepeat(elms) !== repeat) {
      Nuvola.clickOnElement(elms.repeat)
    }
  }

  WebApp.start()
})(this) // function(Nuvola)
