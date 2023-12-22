console.log("AudioManager loaded.");

class audioManager {
    constructor() {
        this.tracks = new Map();
        //zach made sound fx too loud so default is 0.35. Can be edited through user settings
        let volumeAdjust = 1;
        if(localStorage.getItem("devicesettings")) {
            let deviceSettings = JSON.parse(localStorage.getItem("devicesettings"));
            volumeAdjust = deviceSettings["audio-volume"] / 100;
        }
        this.defaultVolume = 0.35 * volumeAdjust;
    }

    play(url, stopAll = false, fadeOut = false, loop = false) {
        return new Promise((resolve, reject) => {
            if (stopAll) {
                this.stopAll(fadeOut);
            }
            const audio = new Audio("../audio/" + url);
            audio.onloadedmetadata = () => {
                audio.loop = loop;
                audio.volume = this.defaultVolume;
                audio.play()
                    .then(() => resolve())
                    .catch(error => reject(error));
            };
            audio.onerror = error => reject(error);
            this.tracks.set(url, audio);
        });
    }

    stop(url, fadeOut = false) {
        const audio = this.tracks.get(url);
        if (audio) {
            if (fadeOut) {
                this.fadeOut(audio)
                    .then(() => {
                        audio.pause();
                        audio.currentTime = 0;
                    })
                    .catch(error => console.error(error));
            } else {
                audio.pause();
                audio.currentTime = 0;
            }
        }
    }

    stopAll(fadeOut = false) {
        this.tracks.forEach((audio, url) => {
            if(fadeOut) {
                this.fadeOut(audio)
                    .then(() => {
                        audio.pause();
                        audio.currentTime = 0;
                    })
                    .catch(error => console.error(error));
            } else {
                audio.pause();
                audio.currentTime = 0;
            }
        });
    }

    fadeOut(audio) {
        return new Promise((resolve, reject) => {
            const fadeOutInterval = setInterval(() => {
                if (audio.volume > 0) {
                    audio.volume -= 0.1;
                    // Check if volume is close enough to 0, weird floating point issue
                    if(audio.volume < 0.08) {
                        audio.volume = 0;
                    }
                } else {
                    clearInterval(fadeOutInterval);
                    resolve();
                }
            }, 100);
        });
    }

    fadeIn(audio) {
        return new Promise((resolve, reject) => {
            const fadeInInterval = setInterval(() => {
                if (audio.volume < 1) {
                    audio.volume += 0.1;
                    // Check if volume is close enough to 1, weird floating point issue
                    if(audio.volume > 0.92) {
                        audio.volume = 0;
                    }
                } else {
                    clearInterval(fadeInInterval);
                    resolve();
                }
            }, 100);
        });
    }

    setVolume(url, volume) {
        const track = this.tracks.get(url);
        if (track) {
            if (volume >= 0 && volume <= 1) {
                track.volume = volume;
            } else {
                console.error("Invalid volume value:", volume);
            }
        } else {
            console.error("Track not found:", url);
        }
    }
}

const audioPlayer = new audioManager();
