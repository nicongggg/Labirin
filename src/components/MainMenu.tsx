import { useState, useEffect } from 'react';
import { Play, Volume2, VolumeX, BookOpen, ShieldAlert, Skull } from 'lucide-react';
import { soundManager } from '../utils/audio';

interface MainMenuProps {
  onStartGame: () => void;
}

export default function MainMenu({ onStartGame }: MainMenuProps) {
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showStory, setShowStory] = useState(false);
  const [isHoveringPlay, setIsHoveringPlay] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  // Toggle ambient eerie sound
  const toggleAudio = () => {
    soundManager.resumeContext();
    if (!audioEnabled) {
      soundManager.startAmbient();
      setAudioEnabled(true);
    } else {
      soundManager.stopAmbient();
      setAudioEnabled(false);
    }
  };

  const handlePlayClick = () => {
    soundManager.resumeContext();
    soundManager.playStartSound();
    setIsStarting(true);
    setTimeout(() => {
      onStartGame();
    }, 1200);
  };

  useEffect(() => {
    // Ambient heartbeat on hover play
    let timer: NodeJS.Timeout;
    if (isHoveringPlay) {
      soundManager.playHeartbeat();
      timer = setInterval(() => {
        soundManager.playHeartbeat();
      }, 900);
    }
    return () => clearInterval(timer);
  }, [isHoveringPlay]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black text-neutral-200 select-none flex flex-col justify-between p-6 md:p-12">
      {/* Background Animated Fog & Red Vignette */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,_rgba(136,19,55,0.25)_0%,_rgba(10,10,10,0.95)_70%,_#000000_100%)] z-0" />
      
      {/* Subtle Fog / Noise scanline layer */}
      <div 
        className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] animate-pulse"
      />

      {/* Top Bar */}
      <header className="relative z-10 flex justify-between items-center w-full max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
          <span className="text-xs uppercase tracking-widest text-neutral-400 font-mono">
            3D Survival Horror Labirin
          </span>
        </div>

        {/* Audio Toggle */}
        <button
          id="toggle-audio-btn"
          onClick={toggleAudio}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-neutral-800 bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300 hover:text-white transition-all text-xs font-mono cursor-pointer"
          title={audioEnabled ? "Matikan Suara Ambience" : "Nyalakan Suara Ambience"}
        >
          {audioEnabled ? (
            <>
              <Volume2 className="w-4 h-4 text-red-500 animate-pulse" />
              <span>Audio: Aktif</span>
            </>
          ) : (
            <>
              <VolumeX className="w-4 h-4 text-neutral-500" />
              <span>Nyalakan Ambience</span>
            </>
          )}
        </button>
      </header>

      {/* Center Section: Main Title & Play Button */}
      <main className="relative z-10 flex flex-col items-center justify-center text-center my-auto">
        {/* Warning Icon Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full bg-red-950/50 border border-red-800/60 text-red-400 text-xs tracking-wider">
          <Skull className="w-3.5 h-3.5" />
          <span>GUNAKAN HEADPHONE UNTUK SENSASI MAKSIMAL</span>
        </div>

        {/* Spooky Title */}
        <h1 
          className="text-5xl md:text-8xl font-black text-neutral-100 tracking-wider mb-2 drop-shadow-[0_0_25px_rgba(220,38,38,0.7)]"
          style={{ fontFamily: "'Cinzel', serif" }}
        >
          LABIRIN TERKUTUK
        </h1>
        
        {/* Subtitle with creepy font */}
        <p 
          className="text-2xl md:text-3xl text-red-500 tracking-widest mb-10"
          style={{ fontFamily: "'Creepster', cursive" }}
        >
          Teror Pocong, Kuntilanak & Genderuwo
        </p>

        {/* Interactive Play Button */}
        <div className="relative group">
          {/* Subtle blood/flame aura around button */}
          <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-red-900 via-red-600 to-red-900 opacity-60 blur-md group-hover:opacity-100 transition duration-500 group-hover:scale-105" />
          
          <button
            id="play-game-button"
            disabled={isStarting}
            onMouseEnter={() => {
              setIsHoveringPlay(true);
              soundManager.playHoverSound();
            }}
            onMouseLeave={() => setIsHoveringPlay(false)}
            onClick={handlePlayClick}
            className={`relative px-12 py-5 rounded-xl bg-gradient-to-b from-neutral-900 to-black border-2 border-red-700/80 hover:border-red-500 text-white font-bold text-lg md:text-xl tracking-widest uppercase transition-all duration-300 flex items-center gap-4 cursor-pointer shadow-[0_0_30px_rgba(185,28,28,0.4)] ${
              isStarting ? 'scale-95 opacity-80' : 'hover:scale-105 active:scale-95'
            }`}
          >
            {isStarting ? (
              <>
                <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-red-400 animate-pulse">MEMASUKI LABIRIN...</span>
              </>
            ) : (
              <>
                <Play className="w-6 h-6 text-red-500 fill-red-600 group-hover:scale-110 transition-transform" />
                <span>MAIN SEKARANG</span>
              </>
            )}
          </button>
        </div>

        {/* Quick hint beneath play button */}
        <p className="mt-4 text-xs text-neutral-500 font-mono">
          Tekan 'Main Sekarang' untuk memulai petualangan 3D
        </p>
      </main>

      {/* Bottom Controls / Modals Bar */}
      <footer className="relative z-10 w-full max-w-3xl mx-auto flex flex-wrap justify-center gap-4">
        <button
          id="btn-tutorial"
          onClick={() => {
            soundManager.playHoverSound();
            setShowTutorial(true);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-950/80 border border-neutral-800 hover:border-neutral-600 text-neutral-300 hover:text-white text-xs font-mono transition-all cursor-pointer"
        >
          <BookOpen className="w-4 h-4 text-amber-500" />
          <span>Cara Main & Lemari Sembunyi</span>
        </button>

        <button
          id="btn-story"
          onClick={() => {
            soundManager.playHoverSound();
            setShowStory(true);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-950/80 border border-neutral-800 hover:border-neutral-600 text-neutral-300 hover:text-white text-xs font-mono transition-all cursor-pointer"
        >
          <ShieldAlert className="w-4 h-4 text-red-400" />
          <span>Misteri Hantu & Lemari</span>
        </button>
      </footer>

      {/* Modal: Tutorial / Controls */}
      {showTutorial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-neutral-950 border border-neutral-800 max-w-lg w-full rounded-2xl p-6 shadow-2xl relative">
            <h3 className="text-xl font-bold text-red-500 mb-4 flex items-center gap-2" style={{ fontFamily: "'Cinzel', serif" }}>
              <BookOpen className="w-5 h-5 text-red-500" />
              PANDUAN BERTAHAN HIDUP DI LABIRIN
            </h3>

            <div className="space-y-4 text-sm text-neutral-300">
              <div className="p-3 bg-neutral-900 rounded-lg border border-neutral-800">
                <p className="font-semibold text-white mb-1">🎮 Kontrol Gerakan (FPS 3D):</p>
                <p className="text-xs text-neutral-400">
                  <span className="text-amber-400 font-mono">W / A / S / D</span> : Bergerak maju, kiri, mundur, kanan.<br />
                  <span className="text-amber-400 font-mono">Mouse</span> : Memutar pandangan & mengarahkan senter.<br />
                  <span className="text-amber-400 font-mono">Shift</span> : Lari cepat (waspada stamina).<br />
                  <span className="text-amber-400 font-mono">F</span> : Menyalakan / mematikan Senter.
                </p>
              </div>

              <div className="p-3 bg-neutral-900 rounded-lg border border-neutral-800">
                <p className="font-semibold text-red-400 mb-1">🚪 Mekanik Lemari Persembunyian (Fitur Wajib):</p>
                <p className="text-xs text-neutral-400">
                  Saat kamu dikejar hantu, cari lemari kayu tua terdekat dan tekan <span className="text-amber-400 font-mono font-bold">[E]</span> untuk sembunyi ke dalam.
                  Hantu akan kehilangan jejakmu dan pergi menjauh! Tekan <span className="text-amber-400 font-mono font-bold">[E]</span> lagi untuk keluar saat suasana sudah aman.
                </p>
              </div>

              <div className="p-3 bg-neutral-900 rounded-lg border border-neutral-800">
                <p className="font-semibold text-purple-400 mb-1">🎯 Misi Utama:</p>
                <p className="text-xs text-neutral-400">
                  Cari gerbang keluar bercahaya hijau misterius di ujung labirin sebelum kamu tertangkap oleh penunggu labirin!
                </p>
              </div>
            </div>

            <button
              id="close-tutorial-btn"
              onClick={() => {
                soundManager.playHoverSound();
                setShowTutorial(false);
              }}
              className="mt-6 w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl font-medium text-sm transition cursor-pointer"
            >
              Saya Siap, Mengerti!
            </button>
          </div>
        </div>
      )}

      {/* Modal: Story & Hantu Lore */}
      {showStory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-neutral-950 border border-neutral-800 max-w-lg w-full rounded-2xl p-6 shadow-2xl relative">
            <h3 className="text-xl font-bold text-red-500 mb-3 flex items-center gap-2" style={{ fontFamily: "'Cinzel', serif" }}>
              <Skull className="w-5 h-5 text-red-500" />
              ENTITAS PENUNGGU LABIRIN
            </h3>

            <div className="space-y-3 text-sm text-neutral-300">
              <div className="p-3 bg-neutral-900/60 border border-neutral-700/60 rounded-lg">
                <p className="font-semibold text-neutral-200">💀 Pocong Terkutuk</p>
                <p className="text-xs text-neutral-400 mt-1">
                  Sosok terbungkus kain kafan lusuh yang melompat pelan di kegelapan lorong. Tatapan matanya yang merah menyala membuatmu gemetar. Jangan biarkan dia mendekat!
                </p>
              </div>

              <div className="p-3 bg-red-950/20 border border-red-900/40 rounded-lg">
                <p className="font-semibold text-red-300">👻 Kuntilanak</p>
                <p className="text-xs text-neutral-400 mt-1">
                  Sosok bergaun putih panjang melayang dengan rambut terurai. Jika kamu mendengar suara tawa melengking khasnya melambat dan semakin dekat, segera bersembunyi atau lari!
                </p>
              </div>

              <div className="p-3 bg-amber-950/20 border border-amber-900/40 rounded-lg">
                <p className="font-semibold text-amber-300">👹 Genderuwo</p>
                <p className="text-xs text-neutral-400 mt-1">
                  Makhluk raksasa berbulu hitam lebat dengan mata merah menyala. Dia berpatroli dengan geraman berat yang bergetar di lantai labirin.
                </p>
              </div>
            </div>

            <button
              id="close-story-btn"
              onClick={() => {
                soundManager.playHoverSound();
                setShowStory(false);
              }}
              className="mt-6 w-full py-2.5 bg-red-900/50 hover:bg-red-900 text-white rounded-xl font-medium text-sm transition cursor-pointer"
            >
              Tutup Catatan
            </button>
          </div>
        </div>
      )}

      {/* Flash effect when entering game */}
      {isStarting && (
        <div className="fixed inset-0 bg-red-950 z-50 animate-ping opacity-30 pointer-events-none" />
      )}
    </div>
  );
}
