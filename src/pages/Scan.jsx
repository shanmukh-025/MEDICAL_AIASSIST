import React, { useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import Tesseract from 'tesseract.js';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Type, ScanBarcode, Image as ImageIcon, Zap, ZapOff, Search, RefreshCw, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const Scan = () => {
  const navigate = useNavigate();
  const webcamRef = useRef(null);
  const fileInputRef = useRef(null); // Reference for the hidden file input
  
  // MODES: 'text' | 'barcode'
  const [mode, setMode] = useState('text'); 
  
  // CAMERA STATE
  const [torch, setTorch] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [error, setError] = useState('');
  
  // PROCESSING STATE
  const [image, setImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [scannedText, setScannedText] = useState(''); 
  const [showVerifyModal, setShowVerifyModal] = useState(false);

  // --- 1. HANDLE LIVE CAMERA CAPTURE ---
  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      processImage(imageSrc);
    } else {
      toast.error("Camera capture failed.");
    }
  }, [webcamRef, mode]);

  // --- 2. HANDLE GALLERY UPLOAD (New Feature) ---
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        // Send the uploaded image to the SAME processing function
        processImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // --- 3. INTELLIGENT PROCESSING (Works for Both) ---
  const processImage = async (imgSrc) => {
    setImage(imgSrc); // Show the captured/uploaded image
    setIsProcessing(true);
    setProgress(0);
    setError('');

    if (mode === 'text') {
        // OCR PROCESSING
        try {
          const result = await Tesseract.recognize(
            imgSrc,
            'eng',
            { 
              logger: m => {
                if (m.status === 'recognizing text') setProgress(Math.floor(m.progress * 100));
              } 
            }
          );
          
          // Clean up text (remove special chars, keep alphanumeric)
          const cleanText = result.data.text.replace(/[^a-zA-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
          
          if (cleanText.length < 3) throw new Error("Text too blurry");
          
          setScannedText(cleanText);
          setIsProcessing(false);
          setShowVerifyModal(true);
          toast.success("Text Detected!");

        } catch (err) {
          setError('Could not read text. Please try uploading a clear photo.');
          setIsProcessing(false);
          toast.error("Scan Failed. Try Upload.");
        }
    } else {
        // BARCODE SIMULATION
        setTimeout(() => {
            setScannedText("8901023004562"); 
            setIsProcessing(false);
            setShowVerifyModal(true); 
        }, 2000);
    }
  };

  // --- 4. TOGGLE FLASHLIGHT ---
  const toggleTorch = () => {
    const track = webcamRef.current?.video?.srcObject?.getVideoTracks()[0];
    if (track && track.getCapabilities().torch) {
        track.applyConstraints({ advanced: [{ torch: !torch }] });
        setTorch(!torch);
    } else {
        toast.error("Flashlight not supported on this device");
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col h-screen w-screen overflow-hidden font-sans">
      
      {/* HEADER OVERLAY */}
      <div className="absolute top-0 w-full p-4 z-30 flex justify-between items-center bg-gradient-to-b from-black/90 to-transparent">
        <button onClick={() => navigate('/')} className="text-white bg-white/20 p-3 rounded-full backdrop-blur-md hover:bg-white/30 transition">
          <ArrowLeft size={24} />
        </button>
        
        {/* Mode Switcher */}
        <div className="flex bg-black/50 rounded-full p-1 backdrop-blur-md border border-white/20">
            <button 
                onClick={() => setMode('text')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition ${mode === 'text' ? 'bg-white text-black' : 'text-white'}`}
            >
                <Type size={14} /> Text
            </button>
            <button 
                onClick={() => setMode('barcode')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition ${mode === 'barcode' ? 'bg-white text-black' : 'text-white'}`}
            >
                <ScanBarcode size={14} /> Barcode
            </button>
        </div>

        {/* Torch Toggle */}
        <button onClick={toggleTorch} className="text-white bg-white/20 p-3 rounded-full backdrop-blur-md hover:bg-white/30 transition">
           {torch ? <Zap size={24} fill="yellow" className="text-yellow-400"/> : <ZapOff size={24} />}
        </button>
      </div>

      {/* CAMERA VIEWFINDER */}
      <div className="flex-1 relative bg-gray-900 flex items-center justify-center">
        
        {/* Error State */}
        {error && (
            <div className="absolute z-50 top-24 bg-red-500/90 text-white px-6 py-3 rounded-full flex items-center gap-2 shadow-lg animate-bounce">
                <AlertCircle size={20} />
                <p className="text-sm font-bold">{error}</p>
            </div>
        )}

        {/* Loading State */}
        {!cameraReady && !image && (
             <div className="absolute z-40 text-white flex flex-col items-center">
                <Loader2 className="animate-spin mb-4 text-emerald-500" size={48} />
                <p className="font-bold tracking-widest uppercase text-xs">Initializing Camera...</p>
             </div>
        )}

        {/* Live Camera */}
        {!image && (
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              videoConstraints={{ facingMode: "environment" }} // Back Camera
              onUserMedia={() => setCameraReady(true)}
              onUserMediaError={() => setError("Camera Access Denied")}
              className="absolute inset-0 w-full h-full object-cover"
            />
        )}

        {/* Captured Image Preview */}
        {image && (
            <div className="absolute inset-0 z-20 bg-black">
                <img src={image} alt="Captured" className="w-full h-full object-contain opacity-50" />
            </div>
        )}

        {/* SCANNER GUIDES (Overlay) */}
        {!image && cameraReady && (
            <div className={`relative z-20 border-2 rounded-2xl flex items-center justify-center shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] transition-all duration-300 ${mode === 'text' ? 'w-80 h-48 border-white/80' : 'w-80 h-24 border-red-500/80'}`}>
                {mode === 'barcode' && <div className="absolute w-[90%] h-0.5 bg-red-500 animate-scan shadow-[0_0_15px_red]"></div>}
                
                {/* Manual Input Trigger */}
                <div className="absolute -bottom-16 w-full px-4">
                     <p className="text-white/70 text-center text-xs font-medium mb-2">Scan failed? Enter manually:</p>
                     <div className="flex gap-2">
                        <input 
                            type="text" 
                            placeholder={mode === 'text' ? "Type Name..." : "Type Code..."}
                            className="flex-1 bg-black/50 border border-white/30 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-emerald-500 transition"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') navigate(`/result?search=${e.target.value}`);
                            }}
                        />
                        <button className="bg-emerald-600 p-2 rounded-lg text-white"><Search size={16}/></button>
                     </div>
                </div>
            </div>
        )}

        {/* PROCESSING LOADER */}
        {isProcessing && (
             <div className="absolute z-50 bg-black/80 backdrop-blur-xl p-8 rounded-3xl flex flex-col items-center border border-white/10 shadow-2xl">
                <Loader2 className="text-emerald-500 animate-spin mb-4" size={56} />
                <h3 className="text-white font-bold text-xl mb-1">Analyzing...</h3>
                <p className="text-gray-400 text-sm">
                    {mode === 'text' ? `Reading Text (${progress}%)` : "Decoding Barcode"}
                </p>
             </div>
        )}
      </div>

      {/* BOTTOM CONTROLS */}
      <div className="h-36 bg-black flex items-center justify-around px-8 pb-6 z-30">
        
        {/* --- UPLOAD BUTTON (THE FEATURE YOU REQUESTED) --- */}
        <div className="flex flex-col items-center gap-2">
            <button 
                onClick={() => fileInputRef.current.click()}
                className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center text-white border border-gray-700 hover:bg-gray-700 active:scale-95 transition"
            >
                <ImageIcon size={20} />
            </button>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Upload</span>
            
            {/* Hidden Input for File Selection */}
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleFileUpload} 
            />
        </div>

        {/* --- LIVE CAPTURE BUTTON --- */}
        <div className="relative">
            {!isProcessing && !image && (
            <button 
                onClick={capture}
                className="w-20 h-20 bg-white rounded-full border-4 border-gray-400 flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.3)] active:scale-90 transition duration-200 group"
            >
                <div className="w-16 h-16 bg-white rounded-full border-2 border-black group-hover:scale-95 transition"></div>
            </button>
            )}
            {image && (
               <button onClick={() => {setImage(null); setIsProcessing(false);}} className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center text-white border border-gray-600">
                   <RefreshCw size={24} />
               </button> 
            )}
        </div>

        {/* Spacer for Balance */}
        <div className="w-12 flex flex-col items-center gap-2 opacity-0">
             <div className="w-12 h-12"></div>
             <span>Space</span>
        </div>

      </div>

      {/* VERIFICATION MODAL */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-end sm:items-center justify-center sm:p-4 backdrop-blur-sm">
            <div className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10">
                <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-6 sm:hidden"></div>
                
                <h3 className="text-gray-900 font-bold text-xl mb-1">Result Found</h3>
                <p className="text-gray-500 text-sm mb-4">We detected the following text. Edit if needed:</p>
                
                <div className="bg-gray-50 p-2 rounded-xl border border-gray-200 mb-6">
                    <input 
                        type="text" 
                        value={scannedText} 
                        onChange={(e) => setScannedText(e.target.value)} 
                        className="w-full bg-transparent p-2 text-lg font-bold text-gray-900 outline-none" 
                    />
                </div>

                <div className="flex gap-3">
                    <button 
                        onClick={() => {setImage(null); setShowVerifyModal(false);}} 
                        className="flex-1 py-3.5 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition"
                    >
                        Retake
                    </button>
                    <button 
                        onClick={() => navigate(`/result?search=${scannedText}`)} 
                        className="flex-1 py-3.5 rounded-xl bg-emerald-600 text-white font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-700 active:scale-95 transition"
                    >
                        Analyze Now
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Scan;