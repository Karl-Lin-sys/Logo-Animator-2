import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, Video, Sparkles, Loader2, Play, Wand2, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'generate' | 'upload'>('generate');
  
  // Image Generation State
  const [description, setDescription] = useState('');
  const [imageSize, setImageSize] = useState('1K');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  
  // Video Generation State
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [videoDescription, setVideoDescription] = useState('A sleek, modern cinematic reveal animation of the logo');
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoProgress, setVideoProgress] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentImageToAnimate = activeTab === 'generate' ? generatedImageUrl : uploadedImageUrl;

  const handleGenerateImage = async () => {
    if (!description.trim()) return;
    setIsGeneratingImage(true);
    setImageError(null);
    setGeneratedImageUrl(null);
    setVideoUrl(null); 
    setVideoError(null);
    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, size: imageSize })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate image');
      setGeneratedImageUrl(data.imageUrl);
    } catch (err: any) {
      setImageError(err.message);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedImageUrl(event.target?.result as string);
      setVideoUrl(null);
      setVideoError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateVideo = async () => {
    if (!currentImageToAnimate) return;
    setIsGeneratingVideo(true);
    setVideoError(null);
    setVideoProgress('Initializing Veo 3.1 video generation...');
    setVideoUrl(null);
    try {
      // Extract base64 and mimeType
      const match = currentImageToAnimate.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
      if (!match) throw new Error("Invalid image format or missing image data");
      const mimeType = match[1];
      const imageBytes = match[2];

      const startRes = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imageBytes,
          mimeType,
          description: videoDescription,
          aspectRatio
        })
      });
      const startData = await startRes.json();
      if (!startRes.ok) throw new Error(startData.error || 'Failed to start video generation');
      
      const operationName = startData.operationName;
      setVideoProgress('Generating video. This process can take a few minutes...');
      
      let isDone = false;
      while (!isDone) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        const statusRes = await fetch('/api/video-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ operationName })
        });
        const statusData = await statusRes.json();
        if (!statusRes.ok) throw new Error(statusData.error || 'Polling failed');
        if (statusData.done) {
          isDone = true;
        }
      }
      
      setVideoProgress('Finalizing and downloading video...');
      
      const downloadRes = await fetch('/api/video-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operationName })
      });
      
      if (!downloadRes.ok) {
         const errText = await downloadRes.text();
         throw new Error(errText || 'Download failed');
      }
      
      const blob = await downloadRes.blob();
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      setVideoProgress(null);
    } catch (err: any) {
      setVideoError(err.message);
      setVideoProgress(null);
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 px-6 py-4 sticky top-0 z-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 text-white p-2 rounded-lg">
            <Wand2 className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">LogoForge</h1>
        </div>
        <p className="text-sm font-medium text-stone-500">Powered by Gemini 3 Pro & Veo 3.1</p>
      </header>

      <main className="max-w-6xl mx-auto p-6 md:p-10 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
        {/* Left Column: Image Source */}
        <section className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">Step 1: Source Image</h2>
            <p className="text-stone-500">Generate a high-quality logo or upload your own.</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
            <div className="flex border-b border-stone-200">
              <button
                onClick={() => setActiveTab('generate')}
                className={`flex-1 py-3.5 px-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'generate' ? 'bg-indigo-50/50 text-indigo-700 border-b-2 border-indigo-600' : 'text-stone-500 hover:text-stone-700 hover:bg-stone-50'}`}
              >
                <Sparkles className="w-4 h-4" />
                Generate Logo
              </button>
              <button
                onClick={() => setActiveTab('upload')}
                className={`flex-1 py-3.5 px-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'upload' ? 'bg-indigo-50/50 text-indigo-700 border-b-2 border-indigo-600' : 'text-stone-500 hover:text-stone-700 hover:bg-stone-50'}`}
              >
                <Upload className="w-4 h-4" />
                Upload Photo
              </button>
            </div>

            <div className="p-6">
              {activeTab === 'generate' ? (
                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-stone-700 block">Description</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="A minimalist geometric logo for a tech startup, featuring a glowing blue hexagon, vector style, white background"
                      className="w-full min-h-[100px] p-3 rounded-xl border border-stone-300 focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none transition-all resize-none placeholder:text-stone-400"
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-stone-700 block">Resolution</label>
                    <div className="flex gap-3">
                      {['1K', '2K', '4K'].map((size) => (
                        <label key={size} className={`flex-1 flex items-center justify-center py-2.5 rounded-lg border cursor-pointer transition-colors ${imageSize === size ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600' : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50 text-stone-600'}`}>
                          <input type="radio" name="imageSize" value={size} checked={imageSize === size} onChange={(e) => setImageSize(e.target.value)} className="hidden" />
                          <span className="text-sm font-medium">{size}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleGenerateImage}
                    disabled={isGeneratingImage || !description.trim()}
                    className="w-full bg-stone-900 hover:bg-stone-800 disabled:bg-stone-300 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors disabled:cursor-not-allowed"
                  >
                    {isGeneratingImage ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /> Generating Image...</>
                    ) : (
                      <><ImageIcon className="w-5 h-5" /> Generate Image</>
                    )}
                  </button>

                  {imageError && (
                    <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 shrink-0" />
                      <p>{imageError}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-5">
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-stone-300 rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-stone-50 hover:border-stone-400 transition-colors group"
                  >
                    <div className="bg-stone-100 p-4 rounded-full group-hover:bg-white transition-colors">
                      <Upload className="w-6 h-6 text-stone-500" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-stone-700">Click to upload or drag and drop</p>
                      <p className="text-xs text-stone-500 mt-1">PNG, JPG, JPEG up to 10MB</p>
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept="image/png, image/jpeg, image/jpg"
                      className="hidden"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Image Preview Area */}
          <AnimatePresence mode="popLayout">
            {currentImageToAnimate && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white p-4 rounded-2xl shadow-sm border border-stone-200 overflow-hidden"
              >
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="text-sm font-semibold flex items-center gap-1.5 text-emerald-700"><CheckCircle2 className="w-4 h-4" /> Ready for animation</h3>
                </div>
                <div className="aspect-[16/9] w-full rounded-xl overflow-hidden bg-stone-100 flex items-center justify-center border border-stone-200">
                  <img src={currentImageToAnimate} alt="Source" className="w-full h-full object-contain" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Right Column: Video Generation */}
        <section className={`space-y-6 transition-opacity duration-300 ${!currentImageToAnimate ? 'opacity-40 pointer-events-none' : ''}`}>
           <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">Step 2: Animate</h2>
            <p className="text-stone-500">Bring your logo to life with cinematic video.</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-stone-700 block">Animation Prompt</label>
              <textarea
                value={videoDescription}
                onChange={(e) => setVideoDescription(e.target.value)}
                placeholder="Describe how the logo should animate..."
                className="w-full min-h-[80px] p-3 rounded-xl border border-stone-300 focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none transition-all resize-none placeholder:text-stone-400"
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-stone-700 block">Aspect Ratio</label>
              <div className="flex gap-3">
                {['16:9', '9:16'].map((ratio) => (
                  <label key={ratio} className={`flex-1 flex items-center justify-center py-2.5 rounded-lg border cursor-pointer transition-colors ${aspectRatio === ratio ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600' : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50 text-stone-600'}`}>
                    <input type="radio" name="aspectRatio" value={ratio} checked={aspectRatio === ratio} onChange={(e) => setAspectRatio(e.target.value)} className="hidden" />
                    <span className="text-sm font-medium">{ratio === '16:9' ? 'Landscape (16:9)' : 'Portrait (9:16)'}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              onClick={handleGenerateVideo}
              disabled={isGeneratingVideo || !currentImageToAnimate}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-stone-300 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors disabled:cursor-not-allowed"
            >
              {isGeneratingVideo ? (
                <><RefreshCw className="w-5 h-5 animate-spin" /> {videoProgress || 'Processing...'}</>
              ) : (
                <><Video className="w-5 h-5" /> Animate Image</>
              )}
            </button>

            {videoError && (
              <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-start gap-2">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>{videoError}</p>
              </div>
            )}
          </div>

          {/* Video Preview Area */}
          <AnimatePresence mode="popLayout">
            {(isGeneratingVideo || videoUrl) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-4 rounded-2xl shadow-sm border border-stone-200 overflow-hidden"
              >
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="text-sm font-semibold flex items-center gap-1.5 text-stone-900"><Play className="w-4 h-4 text-indigo-600" /> Result</h3>
                </div>
                
                <div className={`w-full rounded-xl overflow-hidden bg-black flex items-center justify-center border border-stone-200 relative ${aspectRatio === '16:9' ? 'aspect-[16/9]' : 'aspect-[9/16]'}`}>
                  {isGeneratingVideo && !videoUrl ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-stone-900/90 text-white p-6 text-center z-10 gap-4">
                      <div className="relative">
                         <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                      </div>
                      <div>
                        <p className="font-medium text-lg">{videoProgress || 'Generating...'}</p>
                        <p className="text-sm text-stone-400 mt-1">AI video generation can take up to 2-3 minutes.</p>
                      </div>
                    </div>
                  ) : null}
                  
                  {videoUrl && (
                    <video 
                      src={videoUrl} 
                      controls 
                      autoPlay 
                      loop 
                      className="w-full h-full object-contain bg-black"
                    />
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>
    </div>
  );
}

