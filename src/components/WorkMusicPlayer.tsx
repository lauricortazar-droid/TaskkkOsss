import React, { useState, useEffect, useRef } from "react";
import {
  Music,
  Disc,
  Play,
  Pause,
  Volume2,
  VolumeX,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Radio,
  Sparkles,
  HardDrive,
  FolderOpen,
  X,
  SkipForward,
  SkipBack,
  Sliders,
  BellOff,
  Check,
} from "lucide-react";
import { MusicPlatform, WorkPlaylist } from "../types";
import { playChime } from "../utils/audio";

const STORAGE_KEY_MUSIC_STATE = "task_os_work_music_v2";
const STORAGE_KEY_CUSTOM_PLAYLISTS = "task_os_custom_playlists_v2";
const STORAGE_KEY_PAUSE_ON_POMODORO = "task_os_pause_music_on_pomodoro";

interface LocalAudioTrack {
  id: string;
  name: string;
  url: string;
}

const DEFAULT_PRESETS: WorkPlaylist[] = [
  // Spotify Presets
  {
    id: "spot-deep-focus",
    title: "Deep Focus (Instrumental & Ambient)",
    platform: "spotify",
    url: "https://open.spotify.com/playlist/37i9dQZF1DWZeKCadgRdKQ",
    embedUrl: "https://open.spotify.com/embed/playlist/37i9dQZF1DWZeKCadgRdKQ?utm_source=generator&theme=0",
    description: "Música instrumental serena para concentración profunda sin distracciones.",
  },
  {
    id: "spot-lofi-beats",
    title: "Lo-Fi Beats para Trabajar",
    platform: "spotify",
    url: "https://open.spotify.com/playlist/37i9dQZF1DXc8kgYqQLMfH",
    embedUrl: "https://open.spotify.com/embed/playlist/37i9dQZF1DXc8kgYqQLMfH?utm_source=generator&theme=0",
    description: "Ritmos suaves lofi ideales para tareas de diseño y redacción.",
  },
  {
    id: "spot-piano-focus",
    title: "Peaceful Piano Clásico",
    platform: "spotify",
    url: "https://open.spotify.com/playlist/37i9dQZF1DX4sWSpwq3LiO",
    embedUrl: "https://open.spotify.com/embed/playlist/37i9dQZF1DX4sWSpwq3LiO?utm_source=generator&theme=0",
    description: "Piezas de piano relajantes para máxima claridad mental.",
  },
  // YouTube Music Presets
  {
    id: "yt-lofi-live",
    title: "Lofi Girl — Beats to Relax/Study to",
    platform: "youtube",
    url: "https://music.youtube.com/watch?v=jfKfPfyJRdk",
    embedUrl: "https://www.youtube.com/embed/jfKfPfyJRdk?autoplay=1&mute=0",
    description: "Transmisión continua de lofi chill hip-hop para trabajar.",
  },
  {
    id: "yt-classical-focus",
    title: "Música Clásica para Alta Concentración",
    platform: "youtube",
    url: "https://music.youtube.com/watch?v=WPni755-Krg",
    embedUrl: "https://www.youtube.com/embed/WPni755-Krg?autoplay=1",
    description: "Mozart, Bach y Chopin seleccionados para potenciar el enfoque.",
  },
  {
    id: "yt-ambient-synth",
    title: "Synthwave / Chillwave Productivo",
    platform: "youtube",
    url: "https://music.youtube.com/watch?v=4xDzrJKXOOY",
    embedUrl: "https://www.youtube.com/embed/4xDzrJKXOOY?autoplay=1",
    description: "Atmósferas electrónicas retro y suaves de alta productividad.",
  },
  // Google Drive Folder Presets / Templates
  {
    id: "gdrive-sample",
    title: "Carpeta de Audio (Google Drive)",
    platform: "gdrive",
    url: "https://drive.google.com",
    embedUrl: "",
    description: "Pega el enlace de tu carpeta de Google Drive para reproducir tus audios aquí.",
    isCustom: true,
  },
];

interface WorkMusicPlayerProps {
  isPomodoroActive?: boolean;
}

export default function WorkMusicPlayer({ isPomodoroActive }: WorkMusicPlayerProps) {
  const [isBarOpen, setIsBarOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activePlatform, setActivePlatform] = useState<MusicPlatform>("spotify");
  const [currentPlaylist, setCurrentPlaylist] = useState<WorkPlaylist>(DEFAULT_PRESETS[0]);
  const [customPlaylists, setCustomPlaylists] = useState<WorkPlaylist[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CUSTOM_PLAYLISTS);
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return [];
  });

  // Local phone / computer folder tracks
  const [localTracks, setLocalTracks] = useState<LocalAudioTrack[]>([]);
  const [localFolderTitle, setLocalFolderTitle] = useState<string>("Carpeta Local");
  const [currentLocalTrackIndex, setCurrentLocalTrackIndex] = useState<number>(0);
  const [isLocalPlaying, setIsLocalPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0.8);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Preference: pause music when pomodoro alarm sounds
  const [pauseOnPomodoroAlarm, setPauseOnPomodoroAlarm] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PAUSE_ON_POMODORO);
      return saved !== null ? JSON.parse(saved) : true;
    } catch (_) {
      return true;
    }
  });

  const [pomodoroPauseNotice, setPomodoroPauseNotice] = useState<string | null>(null);

  // New custom playlist form
  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newPlatform, setNewPlatform] = useState<MusicPlatform>("spotify");

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Load saved state
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MUSIC_STATE);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.currentPlaylist) {
          setCurrentPlaylist(parsed.currentPlaylist);
          setActivePlatform(parsed.currentPlaylist.platform);
        }
      }
    } catch (_) {}
  }, []);

  // Save state on change
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY_MUSIC_STATE,
        JSON.stringify({
          currentPlaylist,
          activePlatform,
        })
      );
    } catch (_) {}
  }, [currentPlaylist, activePlatform]);

  // Persist pauseOnPomodoroAlarm
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PAUSE_ON_POMODORO, JSON.stringify(pauseOnPomodoroAlarm));
    } catch (_) {}
  }, [pauseOnPomodoroAlarm]);

  // Listen to pomodoro-alarm-fired event
  useEffect(() => {
    const handlePomodoroAlarm = () => {
      if (pauseOnPomodoroAlarm) {
        if (audioRef.current && !audioRef.current.paused) {
          audioRef.current.pause();
          setIsLocalPlaying(false);
        }
        setPomodoroPauseNotice("Música pausada automáticamente por alarma de Pomodoro (Ley del Foco).");
        setTimeout(() => setPomodoroPauseNotice(null), 6000);
      }
    };

    window.addEventListener("pomodoro-alarm-fired", handlePomodoroAlarm);
    return () => window.removeEventListener("pomodoro-alarm-fired", handlePomodoroAlarm);
  }, [pauseOnPomodoroAlarm]);

  // Audio element event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration || 0);
    const handleEnded = () => handleNextLocalTrack();
    const handlePlay = () => setIsLocalPlaying(true);
    const handlePause = () => setIsLocalPlaying(false);

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
    };
  }, [localTracks, currentLocalTrackIndex]);

  // Handle local track index change
  useEffect(() => {
    if (activePlatform === "local" && localTracks.length > 0 && audioRef.current) {
      const currentTrack = localTracks[currentLocalTrackIndex];
      if (currentTrack) {
        audioRef.current.src = currentTrack.url;
        audioRef.current.load();
        if (isLocalPlaying) {
          audioRef.current.play().catch((err) => console.warn("Audio autoplay blocked:", err));
        }
      }
    }
  }, [currentLocalTrackIndex, activePlatform, localTracks]);

  // Handle Volume change
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const allPlaylists = [...DEFAULT_PRESETS, ...customPlaylists];
  const filteredPlaylists = allPlaylists.filter((p) => p.platform === activePlatform);

  // Helper to parse embed URLs
  const parseEmbedUrl = (url: string, platform: MusicPlatform): { embedUrl: string; directUrl: string } => {
    const cleanUrl = url.trim();

    if (platform === "spotify") {
      const match = cleanUrl.match(/(playlist|track|album|show|episode)\/([a-zA-Z0-9]+)/);
      if (match) {
        const type = match[1];
        const id = match[2];
        return {
          embedUrl: `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`,
          directUrl: cleanUrl,
        };
      }
      return { embedUrl: cleanUrl, directUrl: cleanUrl };
    }

    if (platform === "youtube") {
      let videoId = "";
      let listId = "";
      const listMatch = cleanUrl.match(/[?&]list=([a-zA-Z0-9_-]+)/);
      if (listMatch) listId = listMatch[1];
      const videoMatch = cleanUrl.match(/(?:watch\?v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
      if (videoMatch) videoId = videoMatch[1];

      if (listId) {
        return {
          embedUrl: `https://www.youtube.com/embed/videoseries?list=${listId}&autoplay=1`,
          directUrl: cleanUrl,
        };
      }
      if (videoId) {
        return {
          embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1`,
          directUrl: cleanUrl,
        };
      }
      return { embedUrl: cleanUrl, directUrl: cleanUrl };
    }

    if (platform === "gdrive") {
      // Google Drive folder: https://drive.google.com/drive/folders/FOLDER_ID
      const folderMatch = cleanUrl.match(/\/folders\/([a-zA-Z0-9_-]+)/);
      if (folderMatch) {
        const folderId = folderMatch[1];
        return {
          embedUrl: `https://drive.google.com/embeddedfolderview?id=${folderId}#list`,
          directUrl: cleanUrl,
        };
      }
      // Single file preview
      const fileMatch = cleanUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || cleanUrl.match(/id=([a-zA-Z0-9_-]+)/);
      if (fileMatch) {
        const fileId = fileMatch[1];
        return {
          embedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
          directUrl: cleanUrl,
        };
      }
      return { embedUrl: cleanUrl, directUrl: cleanUrl };
    }

    return { embedUrl: cleanUrl, directUrl: cleanUrl };
  };

  // Handle local folder selection (from phone / PC)
  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const audioFiles: LocalAudioTrack[] = [];
    const validExtensions = [".mp3", ".m4a", ".wav", ".aac", ".ogg", ".flac", ".mp4", ".weba"];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isAudio =
        file.type.startsWith("audio/") ||
        validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));

      if (isAudio) {
        audioFiles.push({
          id: `track-${i}-${Date.now()}`,
          name: file.name.replace(/\.[^/.]+$/, ""),
          url: URL.createObjectURL(file),
        });
      }
    }

    if (audioFiles.length === 0) {
      alert("No se encontraron archivos de audio (.mp3, .m4a, .wav, .aac, .ogg) en la carpeta seleccionada.");
      return;
    }

    const folderName =
      (files[0] as any).webkitRelativePath?.split("/")[0] ||
      `Carpeta de música (${audioFiles.length} audios)`;

    setLocalTracks(audioFiles);
    setLocalFolderTitle(folderName);
    setCurrentLocalTrackIndex(0);
    setActivePlatform("local");

    const localPl: WorkPlaylist = {
      id: "local-folder-active",
      title: folderName,
      platform: "local",
      url: "",
      embedUrl: "",
      description: `${audioFiles.length} archivos de audio de tu dispositivo`,
      isCustom: true,
    };
    setCurrentPlaylist(localPl);
    setIsBarOpen(true);
    setIsModalOpen(false);

    // Auto-play first track
    setTimeout(() => {
      if (audioRef.current && audioFiles[0]) {
        audioRef.current.src = audioFiles[0].url;
        audioRef.current.play().then(() => setIsLocalPlaying(true)).catch(() => {});
      }
    }, 100);

    playChime("success");
  };

  const toggleLocalPlayPause = () => {
    if (!audioRef.current || localTracks.length === 0) return;
    if (isLocalPlaying) {
      audioRef.current.pause();
      setIsLocalPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsLocalPlaying(true)).catch(() => {});
    }
  };

  const handleNextLocalTrack = () => {
    if (localTracks.length === 0) return;
    setCurrentLocalTrackIndex((prev) => (prev + 1) % localTracks.length);
  };

  const handlePrevLocalTrack = () => {
    if (localTracks.length === 0) return;
    setCurrentLocalTrackIndex((prev) => (prev - 1 + localTracks.length) % localTracks.length);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
    }
  };

  const formatSeconds = (sec: number) => {
    if (isNaN(sec) || sec < 0) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const handleAddCustomPlaylist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newUrl.trim()) return;

    const { embedUrl, directUrl } = parseEmbedUrl(newUrl, newPlatform);

    const newPl: WorkPlaylist = {
      id: `custom-${Date.now()}`,
      title: newTitle.trim(),
      platform: newPlatform,
      url: directUrl,
      embedUrl: embedUrl,
      description: `Carpeta o playlist personalizada de ${newPlatform.toUpperCase()}`,
      isCustom: true,
    };

    const updated = [newPl, ...customPlaylists];
    setCustomPlaylists(updated);
    try {
      localStorage.setItem(STORAGE_KEY_CUSTOM_PLAYLISTS, JSON.stringify(updated));
    } catch (_) {}

    setCurrentPlaylist(newPl);
    setActivePlatform(newPlatform);
    setNewTitle("");
    setNewUrl("");
    playChime("success");
  };

  const handleDeleteCustomPlaylist = (id: string) => {
    const updated = customPlaylists.filter((p) => p.id !== id);
    setCustomPlaylists(updated);
    try {
      localStorage.setItem(STORAGE_KEY_CUSTOM_PLAYLISTS, JSON.stringify(updated));
    } catch (_) {}
    if (currentPlaylist.id === id) {
      setCurrentPlaylist(DEFAULT_PRESETS[0]);
      setActivePlatform(DEFAULT_PRESETS[0].platform);
    }
  };

  const selectPlaylist = (pl: WorkPlaylist) => {
    setCurrentPlaylist(pl);
    setActivePlatform(pl.platform);
    setIsBarOpen(true);
    playChime("tick");
  };

  return (
    <>
      {/* Hidden native audio element for local files */}
      <audio ref={audioRef} preload="auto" />

      {/* Hidden file input supporting directory selection on iOS, Android, and Desktop */}
      <input
        type="file"
        ref={folderInputRef}
        onChange={handleFolderSelect}
        // @ts-ignore
        webkitdirectory="true"
        // @ts-ignore
        directory="true"
        multiple
        accept="audio/*,.mp3,.m4a,.wav,.aac,.ogg,.flac"
        className="hidden"
      />

      {/* Floating Mini Music Bar in bottom right corner */}
      <div
        id="work-music-floating-widget"
        className="fixed bottom-16 sm:bottom-4 right-3 sm:right-5 z-40 flex flex-col items-end"
      >
        {pomodoroPauseNotice && (
          <div className="mb-2 p-2.5 rounded-xl bg-amber-500 text-stone-950 font-bold text-xs shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
            <BellOff size={14} />
            <span>{pomodoroPauseNotice}</span>
          </div>
        )}

        {isBarOpen ? (
          <div className="w-80 sm:w-96 bg-stone-900 text-stone-100 dark:bg-stone-900 border border-stone-700/80 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-2 duration-200">
            {/* Header bar */}
            <div className="p-3 bg-stone-800/95 border-b border-stone-700/70 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    activePlatform === "local" && isLocalPlaying
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-emerald-500/20 text-emerald-400"
                  }`}
                >
                  <Disc
                    size={16}
                    className={
                      (activePlatform === "local" ? isLocalPlaying : true)
                        ? "animate-spin"
                        : ""
                    }
                    style={{ animationDuration: "5s" }}
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold truncate">
                      {activePlatform === "local" && localTracks[currentLocalTrackIndex]
                        ? localTracks[currentLocalTrackIndex].name
                        : currentPlaylist.title}
                    </span>
                    <span
                      className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded uppercase ${
                        activePlatform === "spotify"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : activePlatform === "youtube"
                          ? "bg-rose-500/20 text-rose-300"
                          : activePlatform === "local"
                          ? "bg-amber-500/20 text-amber-300"
                          : "bg-blue-500/20 text-blue-300"
                      }`}
                    >
                      {activePlatform === "local" ? "Carpeta Celular/PC" : currentPlaylist.platform}
                    </span>
                  </div>
                  <p className="text-[10px] text-stone-400 truncate">
                    {activePlatform === "local"
                      ? `${localFolderTitle} (${currentLocalTrackIndex + 1} de ${localTracks.length})`
                      : currentPlaylist.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0 ml-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="p-1.5 rounded-lg text-stone-300 hover:text-white hover:bg-stone-700 transition-colors"
                  title="Cambiar carpeta o plataforma (Celular, Drive, Spotify, YouTube)"
                >
                  <FolderOpen size={15} />
                </button>
                {currentPlaylist.url && (
                  <a
                    href={currentPlaylist.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg text-stone-300 hover:text-white hover:bg-stone-700 transition-colors"
                    title="Abrir en pestaña nueva"
                  >
                    <ExternalLink size={15} />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setIsBarOpen(false)}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-700 transition-colors"
                  title="Minimizar reproductor (la música sigue sonando)"
                >
                  <ChevronDown size={16} />
                </button>
              </div>
            </div>

            {/* Local Folder Player UI */}
            {activePlatform === "local" && (
              <div className="p-3 bg-stone-950/95 space-y-3">
                {localTracks.length > 0 ? (
                  <>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-stone-400 font-mono">
                        <span>{formatSeconds(currentTime)}</span>
                        <span>{formatSeconds(duration)}</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={duration || 100}
                        value={currentTime}
                        onChange={handleSeek}
                        className="w-full h-1.5 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setIsMuted(!isMuted)}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-stone-200"
                        >
                          {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                        </button>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.05}
                          value={isMuted ? 0 : volume}
                          onChange={(e) => {
                            setVolume(parseFloat(e.target.value));
                            setIsMuted(false);
                          }}
                          className="w-16 h-1 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                        />
                      </div>

                      {/* Main Playback buttons */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handlePrevLocalTrack}
                          className="p-2 rounded-xl text-stone-300 hover:text-white hover:bg-stone-800 transition-colors"
                          title="Anterior"
                        >
                          <SkipBack size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={toggleLocalPlayPause}
                          className="p-2.5 rounded-full bg-amber-500 hover:bg-amber-400 text-stone-950 transition-transform active:scale-95 shadow-md"
                          title={isLocalPlaying ? "Pausar" : "Reproducir"}
                        >
                          {isLocalPlaying ? (
                            <Pause size={18} className="fill-current" />
                          ) : (
                            <Play size={18} className="fill-current ml-0.5" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={handleNextLocalTrack}
                          className="p-2 rounded-xl text-stone-300 hover:text-white hover:bg-stone-800 transition-colors"
                          title="Siguiente"
                        >
                          <SkipForward size={16} />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => folderInputRef.current?.click()}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-amber-400 text-[10px] font-semibold flex items-center gap-1"
                        title="Cambiar carpeta del celular o PC"
                      >
                        <FolderOpen size={13} />
                        <span className="hidden sm:inline">Cambiar</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-4 space-y-2">
                    <FolderOpen size={24} className="text-amber-400 mx-auto" />
                    <p className="text-xs text-stone-300 font-medium">
                      Elige una carpeta con audios en tu celular o PC
                    </p>
                    <button
                      type="button"
                      onClick={() => folderInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 text-stone-950 text-xs font-bold hover:bg-amber-400"
                    >
                      <FolderOpen size={14} />
                      <span>Seleccionar Carpeta</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Embedded Players for Spotify, YouTube, Google Drive */}
            {activePlatform !== "local" && (
              <div className="p-2 bg-stone-950/95">
                {currentPlaylist.platform === "spotify" && (
                  <iframe
                    src={currentPlaylist.embedUrl}
                    width="100%"
                    height="152"
                    frameBorder="0"
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy"
                    className="rounded-xl shadow-inner"
                    title="Spotify Focus Player"
                  />
                )}

                {currentPlaylist.platform === "youtube" && (
                  <div className="relative rounded-xl overflow-hidden aspect-video max-h-48 w-full bg-black">
                    <iframe
                      src={currentPlaylist.embedUrl}
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full"
                      title="YouTube Music Focus Player"
                    />
                  </div>
                )}

                {currentPlaylist.platform === "gdrive" && (
                  <div className="p-3 space-y-2 bg-stone-900/90 rounded-xl text-center">
                    <HardDrive size={24} className="text-blue-400 mx-auto" />
                    <p className="text-xs text-stone-300 font-bold">
                      {currentPlaylist.title || "Carpeta de Google Drive"}
                    </p>
                    {currentPlaylist.embedUrl ? (
                      <iframe
                        src={currentPlaylist.embedUrl}
                        width="100%"
                        height="140"
                        className="rounded-lg border border-stone-700 w-full"
                        title="Google Drive Player"
                      />
                    ) : (
                      <p className="text-[11px] text-stone-400">
                        Agrega el enlace compartido de tu carpeta de Google Drive en el selector.
                      </p>
                    )}
                    <a
                      href={currentPlaylist.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
                    >
                      <ExternalLink size={13} />
                      Abrir en Google Drive
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Quick footer bar with Pomodoro sync toggle & minimize */}
            <div className="p-2.5 bg-stone-900 border-t border-stone-800 flex items-center justify-between text-xs text-stone-400">
              <label
                className="flex items-center gap-1.5 cursor-pointer text-[10px] text-stone-300 hover:text-white"
                title="Pausar música automáticamente cuando termine el pomodoro o suene la alarma"
              >
                <input
                  type="checkbox"
                  checked={pauseOnPomodoroAlarm}
                  onChange={(e) => setPauseOnPomodoroAlarm(e.target.checked)}
                  className="rounded border-stone-700 text-amber-500 focus:ring-amber-500/20"
                />
                <span>Pausar con alarma pomodoro</span>
              </label>

              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="text-stone-300 hover:text-amber-400 flex items-center gap-1 font-medium transition-colors text-[11px]"
              >
                <Radio size={12} />
                <span>Explorar</span>
              </button>
            </div>
          </div>
        ) : (
          /* Minimized pill trigger with playback controls */
          <div className="flex items-center gap-1.5 bg-stone-900 text-stone-100 dark:bg-stone-100 dark:text-stone-950 p-1.5 pl-3 rounded-full shadow-2xl border border-stone-700 dark:border-stone-300 transition-all hover:scale-102">
            <button
              type="button"
              id="open-work-music-pill-btn"
              onClick={() => {
                setIsBarOpen(true);
                playChime("tick");
              }}
              className="flex items-center gap-2 text-left"
              title="Expandir reproductor de música de enfoque"
            >
              <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-500 dark:text-amber-600 flex items-center justify-center">
                <Disc
                  size={15}
                  className={
                    (activePlatform === "local" ? isLocalPlaying : true)
                      ? "animate-spin"
                      : ""
                  }
                  style={{ animationDuration: "3s" }}
                />
              </div>
              <div className="min-w-0 pr-1 max-w-[130px] sm:max-w-[170px]">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold leading-none truncate">
                    {activePlatform === "local" && localTracks[currentLocalTrackIndex]
                      ? localTracks[currentLocalTrackIndex].name
                      : "Música de Enfoque"}
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                </div>
                <span className="text-[10px] text-stone-400 dark:text-stone-600 leading-none truncate block mt-0.5">
                  {activePlatform === "local"
                    ? "Carpeta Local"
                    : activePlatform === "gdrive"
                    ? "Google Drive"
                    : activePlatform === "youtube"
                    ? "YouTube"
                    : "Spotify"}
                </span>
              </div>
            </button>

            {/* Quick mini play/pause if local audio */}
            {activePlatform === "local" && (
              <button
                type="button"
                onClick={toggleLocalPlayPause}
                className="w-7 h-7 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center hover:bg-amber-400 transition-colors"
                title={isLocalPlaying ? "Pausar" : "Reproducir"}
              >
                {isLocalPlaying ? (
                  <Pause size={12} className="fill-current" />
                ) : (
                  <Play size={12} className="fill-current ml-0.5" />
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsBarOpen(true)}
              className="p-1 rounded-full text-stone-400 hover:text-white dark:hover:text-stone-900"
              title="Abrir reproductor completo"
            >
              <ChevronUp size={15} />
            </button>
          </div>
        )}
      </div>

      {/* Playlist & Folder Selector Modal */}
      {isModalOpen && (
        <div
          id="music-playlist-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/70 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            id="music-playlist-modal"
            className="relative w-full max-w-xl bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50/70 dark:bg-stone-900/80">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                  <Music size={20} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100">
                    Música de Enfoque y Trabajo
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Reproduce desde carpeta del celular/PC, Google Drive, Spotify o YouTube
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X size={20} />
              </button>
            </div>

            {/* Platform Filter Tabs (including local folder) */}
            <div className="p-3 bg-stone-100 dark:bg-stone-800/60 border-b border-stone-200 dark:border-stone-800">
              <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-[11px] sm:text-xs">
                <button
                  type="button"
                  onClick={() => setActivePlatform("local")}
                  className={`py-2 px-2 rounded-lg font-bold flex items-center justify-center gap-1 transition-all min-h-[40px] ${
                    activePlatform === "local"
                      ? "bg-amber-500 text-stone-950 shadow-xs"
                      : "text-stone-600 dark:text-stone-400 hover:text-stone-950 dark:hover:text-white"
                  }`}
                >
                  <FolderOpen size={14} />
                  <span className="truncate">Mi Celular</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActivePlatform("gdrive")}
                  className={`py-2 px-2 rounded-lg font-bold flex items-center justify-center gap-1 transition-all min-h-[40px] ${
                    activePlatform === "gdrive"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-stone-600 dark:text-stone-400 hover:text-stone-950 dark:hover:text-white"
                  }`}
                >
                  <HardDrive size={14} />
                  <span className="truncate">Google Drive</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActivePlatform("spotify")}
                  className={`py-2 px-2 rounded-lg font-bold flex items-center justify-center gap-1 transition-all min-h-[40px] ${
                    activePlatform === "spotify"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-stone-600 dark:text-stone-400 hover:text-stone-950 dark:hover:text-white"
                  }`}
                >
                  <Disc size={14} />
                  <span className="truncate">Spotify</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActivePlatform("youtube")}
                  className={`py-2 px-2 rounded-lg font-bold flex items-center justify-center gap-1 transition-all min-h-[40px] ${
                    activePlatform === "youtube"
                      ? "bg-rose-600 text-white shadow-xs"
                      : "text-stone-600 dark:text-stone-400 hover:text-stone-950 dark:hover:text-white"
                  }`}
                >
                  <Radio size={14} />
                  <span className="truncate">YouTube</span>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
              {/* Option: Local Folder on phone or PC */}
              {activePlatform === "local" ? (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-4 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
                    <FolderOpen size={24} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                      Reproductor de Carpeta Local (Celular / Computadora)
                    </h4>
                    <p className="text-xs text-stone-600 dark:text-stone-400 max-w-sm mx-auto mt-1">
                      Elige cualquier carpeta de archivos en tu celular o PC con audios (.mp3, .m4a, .wav). Se reproduce en segundo plano y se puede minimizar.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => folderInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-sm shadow-md transition-transform active:scale-95 min-h-[44px]"
                  >
                    <FolderOpen size={18} />
                    <span>Elegir Carpeta de Mi Dispositivo</span>
                  </button>

                  {localTracks.length > 0 && (
                    <div className="pt-3 border-t border-amber-500/20 text-left space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-stone-700 dark:text-stone-300">
                        <span>Pistas cargadas ({localTracks.length}):</span>
                        <span className="text-[10px] text-stone-500 font-mono">{localFolderTitle}</span>
                      </div>
                      <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                        {localTracks.map((tr, idx) => (
                          <div
                            key={tr.id}
                            onClick={() => {
                              setCurrentLocalTrackIndex(idx);
                              setIsBarOpen(true);
                              setIsModalOpen(false);
                            }}
                            className={`p-2 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-colors ${
                              currentLocalTrackIndex === idx
                                ? "bg-amber-500 text-stone-950 font-bold"
                                : "hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200"
                            }`}
                          >
                            <span className="truncate pr-2">
                              {idx + 1}. {tr.name}
                            </span>
                            {currentLocalTrackIndex === idx && <Disc size={13} className="animate-spin shrink-0" />}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Add Custom Playlist / Drive Folder Form */
                <form
                  onSubmit={handleAddCustomPlaylist}
                  className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                      <Plus size={14} className="text-amber-500" />
                      {activePlatform === "gdrive"
                        ? "Añadir Carpeta o Audio de Google Drive"
                        : "Añadir mi propia Playlist o Enlace"}
                    </span>
                    <span className="text-[11px] text-stone-500 font-mono">
                      {activePlatform === "gdrive" ? "Enlace de carpeta o archivo" : activePlatform.toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      required
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="Nombre (ej. Mis Audios de Estudio...)"
                      className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                    <input
                      type="url"
                      required
                      value={newUrl}
                      onChange={(e) => setNewUrl(e.target.value)}
                      placeholder={
                        activePlatform === "gdrive"
                          ? "https://drive.google.com/drive/folders/..."
                          : activePlatform === "spotify"
                          ? "https://open.spotify.com/playlist/..."
                          : "https://music.youtube.com/watch?v=..."
                      }
                      className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-stone-400">
                      Se guarda en tu perfil y estará disponible siempre.
                    </span>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-stone-900 dark:bg-stone-100 text-stone-100 dark:text-stone-900 text-xs font-bold hover:opacity-90 transition-opacity min-h-[40px]"
                    >
                      Guardar
                    </button>
                  </div>
                </form>
              )}

              {/* Setting: Pause when Pomodoro alarm sounds */}
              <div className="p-3.5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/40 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                    <BellOff size={14} className="text-amber-500" />
                    Pausar música al sonar alarma de Pomodoro
                  </span>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">
                    Detiene el audio automáticamente para que escuches la campana y tomes tu descanso.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={pauseOnPomodoroAlarm}
                  onChange={(e) => setPauseOnPomodoroAlarm(e.target.checked)}
                  className="w-4 h-4 rounded border-stone-300 text-amber-500 focus:ring-amber-500/20 cursor-pointer"
                />
              </div>

              {/* Available Playlists List */}
              {activePlatform !== "local" && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider">
                    Listas y Carpetas Disponibles ({activePlatform.toUpperCase()})
                  </h4>

                  <div className="grid grid-cols-1 gap-2.5">
                    {filteredPlaylists.map((pl) => {
                      const isSelected = currentPlaylist.id === pl.id;
                      return (
                        <div
                          key={pl.id}
                          className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                            isSelected
                              ? "bg-amber-50/70 dark:bg-amber-950/20 border-amber-400 dark:border-amber-600/70 shadow-xs"
                              : "bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                pl.platform === "spotify"
                                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                  : pl.platform === "youtube"
                                  ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                                  : "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                              }`}
                            >
                              {isSelected ? (
                                <Disc size={20} className="animate-spin" style={{ animationDuration: "5s" }} />
                              ) : (
                                <Play size={18} />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h5 className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100 truncate">
                                  {pl.title}
                                </h5>
                                {pl.isCustom && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400 font-semibold">
                                    Personalizada
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate">
                                {pl.description}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {pl.url && (
                              <a
                                href={pl.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 min-h-[40px] min-w-[40px] flex items-center justify-center"
                                title="Abrir en pestaña nueva"
                              >
                                <ExternalLink size={16} />
                              </a>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                selectPlaylist(pl);
                                setIsModalOpen(false);
                              }}
                              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all min-h-[40px] flex items-center gap-1.5 ${
                                isSelected
                                  ? "bg-amber-500 text-stone-950 shadow-xs"
                                  : "bg-stone-900 dark:bg-stone-100 text-stone-100 dark:text-stone-900 hover:opacity-90"
                              }`}
                            >
                              {isSelected ? (
                                <>
                                  <Disc size={13} className="animate-spin" />
                                  <span>Activa</span>
                                </>
                              ) : (
                                <>
                                  <Play size={13} />
                                  <span>Reproducir</span>
                                </>
                              )}
                            </button>

                            {pl.isCustom && (
                              <button
                                type="button"
                                onClick={() => handleDeleteCustomPlaylist(pl.id)}
                                className="p-2 rounded-xl text-stone-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 min-h-[40px] min-w-[40px] flex items-center justify-center"
                                title="Eliminar"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 sm:p-4 bg-stone-100/70 dark:bg-stone-900/90 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between text-xs text-stone-500">
              <span className="flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-500" />
                Música minimizable para proteger tu flujo de atención
              </span>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-3.5 py-1.5 rounded-lg bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-200 font-semibold hover:bg-stone-300 dark:hover:bg-stone-700 min-h-[40px]"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
