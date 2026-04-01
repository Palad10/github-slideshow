import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Camera, StopCircle, SwitchCamera, Check } from 'lucide-react';
import api from '../lib/api';

export default function RecordPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const [recording, setRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [duration, setDuration] = useState(0);
  const [uploading, setUploading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('project');
  const navigate = useNavigate();

  const startCamera = useCallback(async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1080 }, height: { ideal: 1920 } },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera access denied:', err);
    }
  }, [facingMode]);

  useEffect(() => {
    startCamera();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startCamera]);

  const startRecording = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : MediaRecorder.isTypeSupported('video/webm')
        ? 'video/webm'
        : 'video/mp4';

    const recorder = new MediaRecorder(streamRef.current, { mimeType });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      setRecordedBlob(blob);
      setRecordedUrl(URL.createObjectURL(blob));
    };

    recorder.start(100);
    mediaRecorderRef.current = recorder;
    setRecording(true);
    setDuration(0);
    timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const toggleCamera = () => {
    setFacingMode((m) => (m === 'environment' ? 'user' : 'environment'));
  };

  const handleRetake = () => {
    setRecordedBlob(null);
    setRecordedUrl(null);
    setDuration(0);
    startCamera();
  };

  const handleUse = async () => {
    if (!recordedBlob || !projectId) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('files', recordedBlob, `recording-${Date.now()}.webm`);
      formData.append('projectId', projectId);
      await api.post('/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      navigate(`/editor/${projectId}`);
    } catch (err) {
      console.error('Upload failed:', err);
      setUploading(false);
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 bg-black z-40 flex flex-col">
      {recordedUrl ? (
        <video
          src={recordedUrl}
          className="flex-1 object-cover"
          controls
          autoPlay
          loop
          playsInline
        />
      ) : (
        <video
          ref={videoRef}
          className="flex-1 object-cover mirror"
          autoPlay
          playsInline
          muted
          style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
        />
      )}

      {recording && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-red-500/80 px-4 py-1 rounded-full flex items-center gap-2">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          <span className="text-sm font-mono font-medium">{formatTime(duration)}</span>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 pb-8 pt-4 bg-gradient-to-t from-black/80 to-transparent">
        {recordedUrl ? (
          <div className="flex items-center justify-center gap-8 px-6">
            <button onClick={handleRetake} className="btn-outline py-3 px-6">
              Retake
            </button>
            <button
              onClick={handleUse}
              disabled={uploading}
              className="btn-primary py-3 px-8 flex items-center gap-2"
            >
              <Check size={18} />
              {uploading ? 'Saving...' : 'Use Clip'}
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-8">
            <button
              onClick={toggleCamera}
              disabled={recording}
              className="p-3 rounded-full bg-white/10 disabled:opacity-30"
            >
              <SwitchCamera size={24} />
            </button>
            <button
              onClick={recording ? stopRecording : startRecording}
              className={`w-16 h-16 rounded-full border-4 border-white flex items-center justify-center ${
                recording ? 'bg-red-500' : 'bg-brand-gold'
              }`}
            >
              {recording ? (
                <StopCircle size={28} className="text-white" />
              ) : (
                <Camera size={28} className="text-brand-navy" />
              )}
            </button>
            <div className="w-12" />
          </div>
        )}
      </div>
    </div>
  );
}
