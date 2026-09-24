const { useState, useEffect, useRef } = React;

// خريطة أسماء السور
const SURAH_NAMES = [
  "الفاتحة", "البقرة", "آل عمران", "النساء", "المائدة", "الأنعام", "الأعراف", "الأنفال", "التوبة", "يونس",
  "هود", "يوسف", "الرعد", "إبراهيم", "الحجر", "النحل", "الإسراء", "الكهف", "مريم", "طه",
  "الأنبياء", "الحج", "المؤمنون", "النور", "الفرقان", "الشعراء", "النمل", "القصص", "العنكبوت", "الروم",
  "لقمان", "السجدة", "الأحزاب", "سبأ", "فاطر", "يس", "الصافات", "ص", "الزمر", "غافر",
  "فصلت", "الشورى", "الزخرف", "الدخان", "الجاثية", "الأحقاف", "محمد", "الفتح", "الحجرات", "ق",
  "الذاريات", "الطور", "النجم", "القمر", "الرحمن", "الواقعة", "الحديد", "المجادلة", "الحشر", "الممتحنة",
  "الصف", "الجمعة", "المنافقون", "التغابن", "الطلاق", "التحريم", "الملك", "القلم", "الحاقة", "المعارج",
  "نوح", "الجن", "المزمل", "المدثر", "القيامة", "الإنسان", "المرسلات", "النبأ", "النازعات", "عبس",
  "التكوير", "الانفطار", "المطففين", "الانشقاق", "البروج", "الطارق", "الأعلى", "الغاشية", "الفجر", "البلد",
  "الشمس", "الليل", "الضحى", "الشرح", "التين", "العلق", "القدر", "البينة", "الزلزلة", "العاديات",
  "القارعة", "التكاثر", "العصر", "الهمزة", "الفيلم", "قريش", "الماعون", "الكوثر", "الكافرون", "النصر",
  "المسد", "الإخلاص", "الفلق", "الناس"
];

// تنظيف النص القرآني للمقارنة المرنة
const normalizeText = (text) => {
  if (!text) return "";
  return text
    .replace(/[\u064B-\u065F\u0670]/g, "") // إزالة التشكيل
    .replace(/[أإآء]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .trim();
};

function App() {
  const [activeTab, setActiveTab] = useState('recitation');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSurahModalOpen, setIsSurahModalOpen] = useState(false);
  const [surahSearch, setSurahSearch] = useState('');
  
  const [selectedSurah, setSelectedSurah] = useState(1);
  const [surahData, setSurahData] = useState(null);
  const [loading, setLoading] = useState(true);

  // التسميع الصوتي
  const [isListening, setIsListening] = useState(false);
  const [currentAyahIndex, setCurrentAyahIndex] = useState(0);
  const [recognizedWords, setRecognizedWords] = useState([]);
  const recognitionRef = useRef(null);

  // المسبحة
  const [tasbeehCount, setTasbeehCount] = useState(0);
  const [tasbeehTarget, setTasbeehTarget] = useState(33);
  const [selectedDhikr, setSelectedDhikr] = useState("سبحان الله");

  // جلب السورة من API
  useEffect(() => {
    setLoading(true);
    fetch(`https://api.alquran.cloud/v1/surah/${selectedSurah}/quran-uthmani`)
      .then(res => res.json())
      .then(data => {
        if (data.status === "OK") {
          setSurahData(data.data);
          setCurrentAyahIndex(0);
          setRecognizedWords([]);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedSurah]);

  // إعداد Web Speech API
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'ar-SA';

      recognitionRef.current.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        
        if (surahData && surahData.ayahs[currentAyahIndex]) {
          const currentAyahText = surahData.ayahs[currentAyahIndex].text;
          const targetWords = currentAyahText.split(' ');
          const spokenWords = transcript.split(' ').map(normalizeText);

          let matched = [];
          spokenWords.forEach((word) => {
            if (word.length > 0) {
              targetWords.forEach((tWord, idx) => {
                if (normalizeText(tWord) === word) {
                  matched.push(idx);
                }
              });
            }
          });

          setRecognizedWords(matched);

          // الانتقال للآية التالية عند الاكتمال
          if (matched.length >= Math.ceil(targetWords.length * 0.7)) {
            if (currentAyahIndex < surahData.ayahs.length - 1) {
              setTimeout(() => {
                setCurrentAyahIndex(prev => prev + 1);
                setRecognizedWords([]);
              }, 1000);
            }
          }
        }
      };

      recognitionRef.current.onend = () => {
        if (isListening) {
          try { recognitionRef.current.start(); } catch(e){}
        }
      };
    }
  }, [surahData, currentAyahIndex, isListening]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("متصفحك لا يدعم التعرف الصوتي مباشرة. يفضل استخدام متصفح Chrome.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const filteredSurahs = SURAH_NAMES.filter((name, idx) => 
    name.includes(surahSearch) || (idx + 1).toString().includes(surahSearch)
  );

  return (
    <div className="min-h-screen flex flex-col justify-between text-slate-800">
      
      {/* Header العلوي */}
      <header className="bg-[#1A3C34] text-amber-100 border-b-2 border-[#D4AF37] sticky top-0 z-40 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3 space-x-reverse">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-[#255046] rounded-lg transition">
              <i data-lucide="menu" className="w-6 h-6 text-[#D4AF37]"></i>
            </button>
            <h1 className="text-2xl font-bold font-quran text-[#D4AF37]">الحمد لله</h1>
          </div>

          <button 
            onClick={() => setIsSurahModalOpen(true)}
            className="bg-[#255046] border border-[#D4AF37]/50 px-4 py-1.5 rounded-full flex items-center space-x-2 space-x-reverse hover:bg-[#2e6256] transition"
          >
            <i data-lucide="book-open" className="w-4 h-4 text-[#D4AF37]"></i>
            <span className="text-sm font-semibold">سورة {SURAH_NAMES[selectedSurah - 1]} ({selectedSurah})</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto w-full p-4 flex-grow">
        
        {/* Navigation Tabs */}
        <div className="flex justify-center space-x-2 space-x-reverse mb-6 bg-[#1A3C34]/10 p-1.5 rounded-xl border border-[#D4AF37]/30">
          <button 
            onClick={() => setActiveTab('recitation')} 
            className={`flex-1 py-2 rounded-lg font-bold transition ${activeTab === 'recitation' ? 'bg-[#1A3C34] text-[#D4AF37] shadow' : 'text-[#1A3C34] hover:bg-[#1A3C34]/10'}`}
          >
            التسميع الصوتي
          </button>
          <button 
            onClick={() => setActiveTab('quran')} 
            className={`flex-1 py-2 rounded-lg font-bold transition ${activeTab === 'quran' ? 'bg-[#1A3C34] text-[#D4AF37] shadow' : 'text-[#1A3C34] hover:bg-[#1A3C34]/10'}`}
          >
            المصحف الكريـم
          </button>
          <button 
            onClick={() => setActiveTab('tasbeeh')} 
            className={`flex-1 py-2 rounded-lg font-bold transition ${activeTab === 'tasbeeh' ? 'bg-[#1A3C34] text-[#D4AF37] shadow' : 'text-[#1A3C34] hover:bg-[#1A3C34]/10'}`}
          >
            المسبحة الإلكترونية
          </button>
        </div>

        {/* 1. قسم التسميع الصوتي */}
        {activeTab === 'recitation' && (
          <div className="bg-[#FAF7ED] border-2 border-[#D4AF37] rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="text-center mb-6">
              <span className="text-xs bg-[#1A3C34] text-[#D4AF37] px-3 py-1 rounded-full border border-[#D4AF37]">
                التسميع التفاعلي الفوري
              </span>
              <h2 className="text-3xl font-bold font-quran text-[#1A3C34] mt-2">سورة {SURAH_NAMES[selectedSurah - 1]}</h2>
            </div>

            {loading ? (
              <div className="text-center py-12 text-[#1A3C34]">جاري تحميل السورة...</div>
            ) : surahData && (
              <div className="space-y-6">
                <div className="bg-white/80 p-6 rounded-xl border border-[#D4AF37]/40 text-center shadow-inner">
                  <div className="text-xs text-slate-500 mb-2">الآية رقم ({currentAyahIndex + 1})</div>
                  <p className="text-2xl md:text-3xl font-quran leading-loose text-slate-800">
                    {surahData.ayahs[currentAyahIndex].text.split(' ').map((word, wIdx) => {
                      const isCorrect = recognizedWords.includes(wIdx);
                      return (
                        <span 
                          key={wIdx} 
                          className={`inline-block mx-1 px-1 rounded transition-colors duration-300 ${
                            isCorrect ? 'bg-emerald-200 text-emerald-900 font-bold scale-105' : ''
                          }`}
                        >
                          {word}
                        </span>
                      );
                    })}
                  </p>
                </div>

                {/* التحكم بالصوت والزر */}
                <div className="flex flex-col items-center justify-center space-y-4">
                  <button 
                    onClick={toggleListening}
                    className={`px-8 py-4 rounded-full font-bold text-lg shadow-lg flex items-center space-x-3 space-x-reverse transition transform active:scale-95 ${
                      isListening ? 'bg-red-600 text-white animate-pulse' : 'bg-[#1A3C34] text-[#D4AF37] hover:bg-[#255046]'
                    }`}
                  >
                    <i data-lucide={isListening ? "mic-off" : "mic"} className="w-6 h-6"></i>
                    <span>{isListening ? 'إيقاف التسميع' : 'ابدأ التسميع الآن'}</span>
                  </button>
                  <p className="text-xs text-slate-500">اقرأ الآية بصوت واضح وسيتم التظليل باللون الأخضر فوراً</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. قسم المصحف الكامل */}
        {activeTab === 'quran' && (
          <div className="bg-[#FAF7ED] border-2 border-[#D4AF37] rounded-2xl p-6 shadow-xl">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold font-quran text-[#1A3C34]">سورة {SURAH_NAMES[selectedSurah - 1]}</h2>
              <div className="text-sm text-amber-800 font-quran mt-1">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</div>
            </div>

            {loading ? (
              <div className="text-center py-12 text-[#1A3C34]">جاري فتح المصحف...</div>
            ) : surahData && (
              <div className="text-justify font-quran text-2xl md:text-3xl leading-[2.5] text-slate-800 bg-white/60 p-6 rounded-xl border border-[#D4AF37]/30">
                {surahData.ayahs.map((ayah) => (
                  <span key={ayah.number}>
                    {ayah.text}{" "}
                    <span className="text-[#D4AF37] text-xl px-1 font-sans">﴿{ayah.numberInSurah}﴾</span>
                    {" "}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3. قسم المسبحة */}
        {activeTab === 'tasbeeh' && (
          <div className="bg-[#FAF7ED] border-2 border-[#D4AF37] rounded-2xl p-8 shadow-xl text-center max-w-md mx-auto">
            <h2 className="text-2xl font-bold text-[#1A3C34] mb-4">المسبحة الإلكترونية</h2>
            
            <select 
              value={selectedDhikr} 
              onChange={(e) => setSelectedDhikr(e.target.value)}
              className="w-full bg-white border border-[#D4AF37] rounded-lg p-2 text-center text-lg font-bold mb-6 text-[#1A3C34]"
            >
              <option value="سبحان الله">سبحان الله</option>
              <option value="الحمد لله">الحمد لله</option>
              <option value="لا إله إلا الله">لا إله إلا الله</option>
              <option value="الله أكبر">الله أكبر</option>
              <option value="أستغفر الله العظيم">أستغفر الله العظيم</option>
            </select>

            <div 
              onClick={() => setTasbeehCount(prev => prev + 1)}
              className="w-48 h-48 rounded-full bg-[#1A3C34] border-4 border-[#D4AF37] mx-auto flex flex-col items-center justify-center cursor-pointer shadow-2xl active:scale-95 transition transform"
            >
              <span className="text-5xl font-bold text-[#D4AF37]">{tasbeehCount}</span>
              <span className="text-xs text-amber-200 mt-2">اضغط للتسبيح</span>
            </div>

            <button 
              onClick={() => setTasbeehCount(0)}
              className="mt-6 px-6 py-2 bg-red-800/10 text-red-800 border border-red-800/30 rounded-lg text-sm hover:bg-red-800/20 transition"
            >
              تصفير العداد
            </button>
          </div>
        )}

      </main>

      {/* Modal اختيار السورة الـ 114 */}
      {isSurahModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#FAF7ED] border-2 border-[#D4AF37] rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 bg-[#1A3C34] text-amber-100 flex items-center justify-between">
              <h3 className="font-bold text-lg">فهرس سور القرآن الكريم (114 سورة)</h3>
              <button onClick={() => setIsSurahModalOpen(false)} className="text-[#D4AF37] text-xl font-bold">✕</button>
            </div>
            
            <div className="p-3 border-b border-[#D4AF37]/30">
              <input 
                type="text" 
                placeholder="ابحث برقم السورة أو اسمها..."
                value={surahSearch}
                onChange={(e) => setSurahSearch(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-[#D4AF37] bg-white text-sm outline-none"
              />
            </div>

            <div className="p-4 overflow-y-auto grid grid-cols-2 gap-2 flex-grow">
              {SURAH_NAMES.map((name, index) => {
                const sNum = index + 1;
                if (!name.includes(surahSearch) && !sNum.toString().includes(surahSearch)) return null;
                return (
                  <button
                    key={sNum}
                    onClick={() => {
                      setSelectedSurah(sNum);
                      setIsSurahModalOpen(false);
                    }}
                    className={`p-3 rounded-lg border text-right transition flex items-center justify-between ${
                      selectedSurah === sNum 
                        ? 'bg-[#1A3C34] text-[#D4AF37] border-[#D4AF37]' 
                        : 'bg-white border-amber-900/10 hover:border-[#D4AF37] text-slate-800'
                    }`}
                  >
                    <span className="font-bold">{sNum}. {name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* القائمة الجانبية ☰ */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-end">
          <div className="w-80 bg-[#1A3C34] text-amber-100 h-full p-6 flex flex-col justify-between border-r-2 border-[#D4AF37]">
            <div>
              <div className="flex justify-between items-center mb-8 border-b border-[#D4AF37]/30 pb-4">
                <h3 className="text-xl font-bold text-[#D4AF37]">قائمة المنصة</h3>
                <button onClick={() => setIsSidebarOpen(false)} className="text-[#D4AF37] text-xl">✕</button>
              </div>

              <div className="space-y-4 text-sm">
                <a href="https://wa.me/0942628974" target="_blank" className="block p-3 bg-[#255046] rounded-lg border border-[#D4AF37]/30">
                  📱 واتساب: 0942628974
                </a>
                <a href="https://instagram.com/4_5x7" target="_blank" className="block p-3 bg-[#255046] rounded-lg border border-[#D4AF37]/30">
                  📷 انستغرام: 4_5x7
                </a>
                <a href="mailto:ldhabder96@gmail.com" className="block p-3 bg-[#255046] rounded-lg border border-[#D4AF37]/30">
                  ✉️ البريد: ldhabder96@gmail.com
                </a>
                <a href="https://hmdllh.onrender.com/" target="_blank" className="block p-3 bg-[#D4AF37] text-[#1A3C34] font-bold rounded-lg text-center">
                  🌐 منصة الحفظ الخارجية
                </a>
              </div>
            </div>

            {/* توقيع الحقوق */}
            <div className="text-center border-t border-[#D4AF37]/30 pt-4 text-xs text-[#D4AF37]">
              برمجة وتطوير: <span className="font-bold">عبدالرحمن</span>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-[#1A3C34] text-[#D4AF37] text-center py-3 border-t border-[#D4AF37] text-xs">
        برمجة وتطوير: <span className="font-bold">عبدالرحمن</span>
      </footer>

    </div>
  );
}

ReactDOM.render(<App />, document.getElementById('root'));
setTimeout(() => lucide.createIcons(), 500);
