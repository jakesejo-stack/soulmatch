let audioContext, masterGain, isPlaying = false, timer;
    const musicBtn = document.getElementById('musicBtn');
    function startAmbient() {
      audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
      if (!masterGain) { masterGain = audioContext.createGain(); masterGain.gain.value = 0.055; masterGain.connect(audioContext.destination); }
      const notes = [261.63, 329.63, 392.00, 493.88, 523.25, 659.25]; let step = 0;
      function playNote(){ if(!isPlaying) return; const osc = audioContext.createOscillator(); const gain = audioContext.createGain(); const now = audioContext.currentTime; osc.type = step % 3 === 0 ? 'triangle' : 'sine'; osc.frequency.value = notes[step % notes.length] / 2; gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(0.18, now + 0.04); gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8); osc.connect(gain); gain.connect(masterGain); osc.start(now); osc.stop(now + 1.9); step++; }
      playNote(); timer = setInterval(playNote, 720);
    }
    musicBtn.addEventListener('click', async () => {
      if (!isPlaying) { isPlaying = true; startAmbient(); if (audioContext.state === 'suspended') await audioContext.resume(); if(masterGain) masterGain.gain.value = 0.055; musicBtn.textContent = 'Stop Music'; }
      else { isPlaying = false; clearInterval(timer); if (masterGain) masterGain.gain.value = 0; musicBtn.textContent = 'Play Music'; }
    });
