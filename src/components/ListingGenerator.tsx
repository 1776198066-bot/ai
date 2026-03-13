import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Copy, CheckCircle2, AlertCircle, Loader2, Info, Upload, Image as ImageIcon, X, History, Trash2, Clock } from 'lucide-react';

interface ListingData {
  title: string;
  titleZh: string;
  bulletPoints: string[];
  bulletPointsZh: string[];
  description: string;
  descriptionZh: string;
  searchTerms: string;
  searchTermsZh: string;
  rufusFaqs: { q: string; a: string }[];
  rufusFaqsZh: { q: string; a: string }[];
  mainImages: { title: string; desc: string }[];
  mainImagesZh: { title: string; desc: string }[];
  aplusImages: { title: string; desc: string }[];
  aplusImagesZh: { title: string; desc: string }[];
}

interface HistoryItem {
  id: string;
  timestamp: number;
  formData: {
    productName: string;
    features: string;
    keywords: string;
    competitorFlaws: string;
    targetAudience: string;
  };
  result: ListingData;
}

export default function ListingGenerator() {
  const [formData, setFormData] = useState({
    productName: '',
    features: '',
    keywords: '',
    competitorFlaws: '',
    targetAudience: '',
  });

  const [image, setImage] = useState<{ file: File; base64: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ListingData | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showZh, setShowZh] = useState<Record<string, boolean>>({});
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('listing_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse history', e);
      }
    }
  }, []);

  const loadHistoryItem = (item: HistoryItem) => {
    setFormData(item.formData);
    setResult(item.result);
    setImage(null);
    setShowHistory(false);
  };

  const deleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHistory(prev => {
      const updated = prev.filter(item => item.id !== id);
      localStorage.setItem('listing_history', JSON.stringify(updated));
      return updated;
    });
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('listing_history');
  };

  const toggleLang = (field: string) => {
    setShowZh((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('图片大小不能超过 5MB。');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage({
          file,
          base64: reader.result as string,
        });
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const generateListing = async () => {
    if (!formData.productName && !image) {
      setError('请至少填写产品名称或上传一张产品图片。');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const prompt = `
        你是一位精通亚马逊 A9（搜索权重）、COSMO（用户意图）和 Rufus（AI 问答推荐）算法的资深 Listing 撰写专家。
        
        请基于以下输入信息（以及可能提供的产品图片），生成一份高度优化的亚马逊 Listing。
        **重要要求**：你需要同时提供**英文原版**（用于亚马逊站点）和**中文翻译版**（方便运营人员审阅）。
        产品名称/类目: ${formData.productName || '请根据图片推断'}
        核心卖点与参数: ${formData.features || '请根据图片推断'}
        目标关键词 (A9 SEO): ${formData.keywords}
        竞品痛点 (Gap Analysis): ${formData.competitorFlaws}
        目标受众/使用场景 (COSMO): ${formData.targetAudience}

        撰写指南：
        1. Title (A9): 最多 200 个字符。自然融入核心关键词。品牌名放首位（如果没有品牌则用 "Generic" 或省略）。
        2. Bullet Points (COSMO & A9): 5 个要点。**格式必须严格为：【小标题】内容。** 例如：【Seamless Wireless Experience】Transform your factory wired... 直击竞品痛点，强调用户意图和具体使用场景。
        3. Description (A9 & Rufus): 讲故事，突出使用场景，排版清晰。
        4. Search Terms (A9): 最多 250 字节。用空格分隔，不要用逗号。包含未在标题中使用的变体词、拼写错误词和受众词。
        5. Rufus FAQs (Rufus): 生成 3-5 个关键的 Q&A（问答对），解决兼容性、局限性和常见的售前疑虑，用于“喂饱” Rufus AI，降低退货率。
        6. Main Images (7张主图策划): 提供 7 张主图的视觉策划建议。第1张为白底首图，第2-7张必须强烈突出竞品痛点解决方案、核心卖点和使用场景。
        7. Premium A+ Images (高级A+ 8张策划): 提供 8 张高级 A+ 页面的视觉策划建议。结合场景、生活方式、痛点对比和品牌故事，提供具体的画面构图和文案建议。

        ⚠️ 绝对红线（违规词黑名单）- 严禁在生成的任何内容中使用以下词汇：
        - 绝对化/夸大宣传: Best, Best seller, Best selling, #1, #1 rated, Top 1, Top rated, No.1, Number one, Highest, Most popular, Ultimate, Perfect, 100% guaranteed, Guaranteed, Unbeatable, Exclusive, Only, Must have, Best on the market, World leading, Premium, Luxury.
        - 医疗/健康/功效宣称: Cure, Heal, Treat, Treatment, Prevent, Prevention, Relief, Relieve, Healing, Therapy, Therapeutic, Medical, Medicinal, Doctor, Clinic, Hospital, Healthy, Health, Immune, Immunity, Anti-virus, Anti-flu, Anti-inflammatory, Detox, Pain relief, Allergy, Arthritis, Diabetes, Cancer, Depression, Sleep aid, Anti-aging, Anti-wrinkle, Fat loss, Weight loss, Slim, Healthy living, Disease, Virus, Bacteria.
        - 杀菌/抗菌/杀虫/消毒: Anti-bacterial, Antibacterial, Anti-microbial, Antimicrobial, Anti-fungal, Antifungal, Mold, Mildew, Mold resistant, Disinfect, Disinfectant, Sanitize, Sanitizer, Sterilize, Sterile, Bug, Insect, Repel, Repellent, Pest, Germ, Kill, Eliminate, Non-toxic, Safe, Non-allergenic, Anti-dust mite.
        - 环保/绿色/可降解: Eco-friendly, Environmentally friendly, Green, Biodegradable, Compostable, Sustainable, Organic, Natural, Non-polluting, Recycled, Zero waste, Carbon neutral, Eco.
        - 促销/价格/营销违规词: Sale, Discount, Deal, Cheap, Affordable, Free, Bonus, Gift, Promotion, Promo, Limited time, Hot, New, Latest, Upcoming, Pre-order, Clearance, Flash sale, Best deal, Save money, Low price, Budget.
        - 评价/Review 诱导: Review, Leave a review, Feedback, Rate, Star, 5 star, Satisfaction, If you like, Please leave, Share your experience.
        - 侵权/品牌/平台违规词: Apple, Samsung, Google, Tesla, Disney, Marvel, Nike, Adidas, Official, Genuine, Original, OEM, Ours, We, Our, You, Website, URL, Link, Email, Phone, QR code, Contact, Shipping fast, Warranty, Lifetime warranty, FDA approved, FDA registered, EPA approved, CE.

        安全合规替代词建议（可参考使用）：
        Best -> Popular / Well-received
        #1 -> Highly rated
        Guaranteed -> Reliable
        Healthy -> Comfortable
        Anti-bacterial -> Dust-proof
        Eco-friendly -> Made of XX material
        Sale -> Currently available
        New -> Recently launched
        Review -> Customer feedback
        Safe -> Designed for daily use
        Premium -> High quality
      `;

      const schema = {
        type: "OBJECT",
        properties: {
          title: { type: "STRING", description: 'Amazon optimized title (English)' },
          titleZh: { type: "STRING", description: 'Title translated to Chinese' },
          bulletPoints: {
            type: "ARRAY",
            items: { type: "STRING" },
            description: '5 optimized bullet points formatted as 【Title】 Content (English)',
          },
          bulletPointsZh: {
            type: "ARRAY",
            items: { type: "STRING" },
            description: '5 optimized bullet points translated to Chinese',
          },
          description: { type: "STRING", description: 'Product description (English)' },
          descriptionZh: { type: "STRING", description: 'Product description translated to Chinese' },
          searchTerms: { type: "STRING", description: 'Backend search terms (max 250 bytes) (English)' },
          searchTermsZh: { type: "STRING", description: 'Backend search terms translated to Chinese' },
          rufusFaqs: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                q: { type: "STRING" },
                a: { type: "STRING" },
              },
              required: ['q', 'a'],
            },
            description: 'FAQs optimized for Rufus AI (English)',
          },
          rufusFaqsZh: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                q: { type: "STRING" },
                a: { type: "STRING" },
              },
              required: ['q', 'a'],
            },
            description: 'FAQs optimized for Rufus AI translated to Chinese',
          },
          mainImages: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                title: { type: "STRING" },
                desc: { type: "STRING" },
              },
              required: ['title', 'desc'],
            },
            description: '7 Main images design suggestions (English)',
          },
          mainImagesZh: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                title: { type: "STRING" },
                desc: { type: "STRING" },
              },
              required: ['title', 'desc'],
            },
            description: '7 Main images design suggestions translated to Chinese',
          },
          aplusImages: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                title: { type: "STRING" },
                desc: { type: "STRING" },
              },
              required: ['title', 'desc'],
            },
            description: '8 Premium A+ images design suggestions (English)',
          },
          aplusImagesZh: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                title: { type: "STRING" },
                desc: { type: "STRING" },
              },
              required: ['title', 'desc'],
            },
            description: '8 Premium A+ images design suggestions translated to Chinese',
          },
        },
        required: ['title', 'titleZh', 'bulletPoints', 'bulletPointsZh', 'description', 'descriptionZh', 'searchTerms', 'searchTermsZh', 'rufusFaqs', 'rufusFaqsZh', 'mainImages', 'mainImagesZh', 'aplusImages', 'aplusImagesZh'],
      };

      const payload: any = {
        prompt,
        schema
      };

      if (image) {
        payload.imageBase64 = image.base64.split(',')[1];
        payload.mimeType = image.file.type;
      }

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '生成失败');
      }

      const data = await response.json();

      if (data.text) {
        const parsedData = JSON.parse(data.text) as ListingData;
        setResult(parsedData);
        
        const newItem: HistoryItem = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          formData: { ...formData },
          result: parsedData,
        };
        setHistory(prev => {
          const updated = [newItem, ...prev].slice(0, 50);
          localStorage.setItem('listing_history', JSON.stringify(updated));
          return updated;
        });
      } else {
        throw new Error('AI 未返回任何内容。');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || '生成 Listing 时发生错误。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">
              亚马逊 Listing 智能生成系统 <span className="text-indigo-600">Pro</span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-sm text-slate-500 font-medium bg-slate-100 px-3 py-1.5 rounded-full">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              A9 & Rufus 算法适配 | 违规词拦截
            </div>
            <button
              onClick={() => setShowHistory(true)}
              className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-indigo-600 bg-white border border-slate-200 hover:border-indigo-200 px-3 py-1.5 rounded-lg transition-colors shadow-sm"
            >
              <History className="w-4 h-4" />
              历史记录
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Input Form */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                产品情报录入
              </h2>
              
              <div className="space-y-4">
                {/* Image Upload Section */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    产品图片分析 (可选)
                  </label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-lg hover:border-indigo-500 transition-colors relative">
                    {image ? (
                      <div className="relative w-full">
                        <img src={image.base64} alt="Product preview" className="mx-auto h-32 object-contain rounded" />
                        <button
                          onClick={removeImage}
                          className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-1 hover:bg-red-200 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1 text-center">
                        <ImageIcon className="mx-auto h-12 w-12 text-slate-400" />
                        <div className="flex text-sm text-slate-600 justify-center">
                          <label
                            htmlFor="file-upload"
                            className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                          >
                            <span>上传图片</span>
                            <input
                              id="file-upload"
                              name="file-upload"
                              type="file"
                              className="sr-only"
                              accept="image/*"
                              onChange={handleImageUpload}
                              ref={fileInputRef}
                            />
                          </label>
                          <p className="pl-1">让 AI 提取卖点</p>
                        </div>
                        <p className="text-xs text-slate-500">PNG, JPG, GIF up to 5MB</p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    产品名称 / 类目 *
                  </label>
                  <input
                    type="text"
                    name="productName"
                    value={formData.productName}
                    onChange={handleInputChange}
                    placeholder="例如：无线 CarPlay 转换器"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    核心卖点与参数 *
                  </label>
                  <textarea
                    name="features"
                    value={formData.features}
                    onChange={handleInputChange}
                    rows={3}
                    placeholder="例如：5GHz WiFi, 蓝牙 5.3, 即插即用, 5秒自动连接"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    目标关键词 (A9 SEO)
                  </label>
                  <textarea
                    name="keywords"
                    value={formData.keywords}
                    onChange={handleInputChange}
                    rows={2}
                    placeholder="例如：wireless carplay adapter, car accessories"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    竞品痛点 (Gap Analysis)
                  </label>
                  <textarea
                    name="competitorFlaws"
                    value={formData.competitorFlaws}
                    onChange={handleInputChange}
                    rows={2}
                    placeholder="例如：竞品容易发热、频繁断连、音频有延迟"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    目标受众 / 使用场景 (COSMO)
                  </label>
                  <textarea
                    name="targetAudience"
                    value={formData.targetAudience}
                    onChange={handleInputChange}
                    rows={2}
                    placeholder="例如：日常通勤者、长途自驾游、送给男士的科技礼物"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none"
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <p>{error}</p>
                  </div>
                )}

                <button
                  onClick={generateListing}
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      正在合成 Listing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      一键生成合规 Listing
                    </>
                  )}
                </button>
              </div>
            </div>
            
            {/* Algorithm Info Card */}
            <div className="bg-indigo-50 rounded-2xl p-5 border border-indigo-100">
              <h3 className="text-sm font-semibold text-indigo-900 flex items-center gap-2 mb-3">
                <Info className="w-4 h-4" />
                底层算法与合规逻辑
              </h3>
              <ul className="text-xs text-indigo-800 space-y-2">
                <li><strong className="font-semibold">A9 (搜索):</strong> 智能分配关键词密度，避免堆砌，最大化自然搜索流量。</li>
                <li><strong className="font-semibold">COSMO (意图):</strong> 将产品参数转化为具体的“用户使用场景”，提升转化率。</li>
                <li><strong className="font-semibold">Rufus (AI):</strong> 自动生成结构化 FAQ，喂饱亚马逊 AI 导购，精准拦截退货。</li>
                <li><strong className="font-semibold text-red-600">合规拦截:</strong> 已内置全套亚马逊违规词黑名单（医疗、夸大、侵权等），确保账号安全。</li>
              </ul>
            </div>
          </div>

          {/* Right Column: Generated Output */}
          <div className="lg:col-span-8">
            {result ? (
              <div className="space-y-6">
                {/* Title Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                    <h3 className="font-semibold text-slate-800">Product Title (标题 - A9 优化)</h3>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleLang('title')}
                        className={`text-xs px-2 py-1 rounded-md font-medium transition-colors border ${showZh.title ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                      >
                        {showZh.title ? '中' : 'EN'}
                      </button>
                      <button 
                        onClick={() => handleCopy(showZh.title ? result.titleZh : result.title, 'title')}
                        className="text-slate-500 hover:text-indigo-600 transition-colors"
                        title="复制内容"
                      >
                        {copiedField === 'title' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-slate-800 font-medium text-lg leading-snug">
                      {showZh.title ? result.titleZh : result.title}
                    </p>
                    <div className="mt-2 text-xs text-slate-500 flex justify-between">
                      <span>字符数: {showZh.title ? result.titleZh.length : result.title.length} / 200</span>
                      {!showZh.title && result.title.length > 200 && <span className="text-amber-500">警告: 超过 200 字符限制</span>}
                    </div>
                  </div>
                </div>

                {/* Bullet Points Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                    <h3 className="font-semibold text-slate-800">Bullet Points (五点描述 - COSMO 场景化)</h3>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleLang('bullets')}
                        className={`text-xs px-2 py-1 rounded-md font-medium transition-colors border ${showZh.bullets ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                      >
                        {showZh.bullets ? '中' : 'EN'}
                      </button>
                      <button 
                        onClick={() => handleCopy((showZh.bullets ? result.bulletPointsZh : result.bulletPoints).join('\n\n'), 'bullets')}
                        className="text-slate-500 hover:text-indigo-600 transition-colors"
                        title="复制内容"
                      >
                        {copiedField === 'bullets' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    {(showZh.bullets ? result.bulletPointsZh : result.bulletPoints).map((bullet, idx) => {
                      // Extract the title part if it matches the 【Title】 format
                      const match = bullet.match(/^(【.*?】)(.*)$/);
                      if (match) {
                        return (
                          <div key={idx} className="flex gap-3">
                            <span className="text-indigo-500 font-bold shrink-0">{idx + 1}.</span>
                            <p className="text-slate-700 text-sm leading-relaxed">
                              <span className="font-bold text-slate-900">{match[1]}</span>
                              {match[2]}
                            </p>
                          </div>
                        );
                      }
                      return (
                        <div key={idx} className="flex gap-3">
                          <span className="text-indigo-500 font-bold shrink-0">{idx + 1}.</span>
                          <p className="text-slate-700 text-sm leading-relaxed">{bullet}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Rufus FAQs Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-emerald-200 overflow-hidden relative">
                  <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                  <div className="bg-emerald-50/50 px-4 py-3 border-b border-emerald-100 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <h3 className="font-semibold text-emerald-900">Rufus AI 知识库 (防退货 Q&A)</h3>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleLang('rufus')}
                        className={`text-xs px-2 py-1 rounded-md font-medium transition-colors border ${showZh.rufus ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50'}`}
                      >
                        {showZh.rufus ? '中' : 'EN'}
                      </button>
                      <button 
                        onClick={() => handleCopy((showZh.rufus ? result.rufusFaqsZh : result.rufusFaqs).map(f => `Q: ${f.q}\nA: ${f.a}`).join('\n\n'), 'rufus')}
                        className="text-emerald-600 hover:text-emerald-800 transition-colors"
                        title="复制内容"
                      >
                        {copiedField === 'rufus' ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="p-4 space-y-4">
                    <p className="text-xs text-emerald-700 mb-2">
                      💡 建议将以下内容放入 A+ 页面的文本模块或 Product Description 中，用于训练 Rufus AI 机器人，精准解答买家疑虑。
                    </p>
                    {(showZh.rufus ? result.rufusFaqsZh : result.rufusFaqs).map((faq, idx) => (
                      <div key={idx} className="bg-white border border-emerald-100 rounded-lg p-3">
                        <p className="font-semibold text-slate-800 text-sm mb-1"><span className="text-emerald-600 mr-1">Q:</span>{faq.q}</p>
                        <p className="text-slate-600 text-sm"><span className="text-emerald-600 font-semibold mr-1">A:</span>{faq.a}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Search Terms Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                    <h3 className="font-semibold text-slate-800">Backend Search Terms (后台搜索词)</h3>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleLang('searchTerms')}
                        className={`text-xs px-2 py-1 rounded-md font-medium transition-colors border ${showZh.searchTerms ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                      >
                        {showZh.searchTerms ? '中' : 'EN'}
                      </button>
                      <button 
                        onClick={() => handleCopy(showZh.searchTerms ? result.searchTermsZh : result.searchTerms, 'searchTerms')}
                        className="text-slate-500 hover:text-indigo-600 transition-colors"
                        title="复制内容"
                      >
                        {copiedField === 'searchTerms' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-slate-700 text-sm font-mono bg-slate-50 p-3 rounded border border-slate-100 break-all">
                      {showZh.searchTerms ? result.searchTermsZh : result.searchTerms}
                    </p>
                    <div className="mt-2 text-xs text-slate-500 flex justify-between">
                      <span>字节数: {new Blob([showZh.searchTerms ? result.searchTermsZh : result.searchTerms]).size} / 250</span>
                      {!showZh.searchTerms && new Blob([result.searchTerms]).size > 250 && <span className="text-red-500 font-medium">警告: 超过 250 字节限制</span>}
                    </div>
                  </div>
                </div>

                {/* Description Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                    <h3 className="font-semibold text-slate-800">Product Description (产品描述)</h3>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleLang('description')}
                        className={`text-xs px-2 py-1 rounded-md font-medium transition-colors border ${showZh.description ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                      >
                        {showZh.description ? '中' : 'EN'}
                      </button>
                      <button 
                        onClick={() => handleCopy(showZh.description ? result.descriptionZh : result.description, 'description')}
                        className="text-slate-500 hover:text-indigo-600 transition-colors"
                        title="复制内容"
                      >
                        {copiedField === 'description' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap">
                      {showZh.description ? result.descriptionZh : result.description}
                    </div>
                  </div>
                </div>

                {/* Main Images Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                    <h3 className="font-semibold text-slate-800">Main Images (7张主图策划)</h3>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleLang('mainImages')}
                        className={`text-xs px-2 py-1 rounded-md font-medium transition-colors border ${showZh.mainImages ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                      >
                        {showZh.mainImages ? '中' : 'EN'}
                      </button>
                      <button 
                        onClick={() => handleCopy((showZh.mainImages ? result.mainImagesZh : result.mainImages).map((img, i) => `Image ${i + 1}: ${img.title}\n${img.desc}`).join('\n\n'), 'mainImages')}
                        className="text-slate-500 hover:text-indigo-600 transition-colors"
                        title="复制内容"
                      >
                        {copiedField === 'mainImages' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="p-4 space-y-4">
                    {(showZh.mainImages ? result.mainImagesZh : result.mainImages).map((img, idx) => (
                      <div key={idx} className="flex gap-3">
                        <span className="text-indigo-500 font-bold shrink-0">图 {idx + 1}.</span>
                        <div>
                          <p className="font-bold text-slate-900 text-sm mb-1">{img.title}</p>
                          <p className="text-slate-700 text-sm leading-relaxed">{img.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Premium A+ Images Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                    <h3 className="font-semibold text-slate-800">Premium A+ Images (高级A+ 8张策划)</h3>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleLang('aplusImages')}
                        className={`text-xs px-2 py-1 rounded-md font-medium transition-colors border ${showZh.aplusImages ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                      >
                        {showZh.aplusImages ? '中' : 'EN'}
                      </button>
                      <button 
                        onClick={() => handleCopy((showZh.aplusImages ? result.aplusImagesZh : result.aplusImages).map((img, i) => `Module ${i + 1}: ${img.title}\n${img.desc}`).join('\n\n'), 'aplusImages')}
                        className="text-slate-500 hover:text-indigo-600 transition-colors"
                        title="复制内容"
                      >
                        {copiedField === 'aplusImages' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="p-4 space-y-4">
                    {(showZh.aplusImages ? result.aplusImagesZh : result.aplusImages).map((img, idx) => (
                      <div key={idx} className="flex gap-3">
                        <span className="text-indigo-500 font-bold shrink-0">模块 {idx + 1}.</span>
                        <div>
                          <p className="font-bold text-slate-900 text-sm mb-1">{img.title}</p>
                          <p className="text-slate-700 text-sm leading-relaxed">{img.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            ) : (
              <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-slate-400 bg-white rounded-2xl border border-slate-200 border-dashed">
                <Sparkles className="w-12 h-12 mb-4 text-slate-300" />
                <p className="text-lg font-medium text-slate-500">等待输入产品信息</p>
                <p className="text-sm mt-1 max-w-sm text-center">在左侧填写产品详情并点击生成，即可获得符合 A9、COSMO 和 Rufus 算法的合规 Listing。</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* History Sidebar */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div 
            className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity" 
            onClick={() => setShowHistory(false)}
          />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-bold text-slate-800">生成记录</h2>
              </div>
              <div className="flex items-center gap-2">
                {history.length > 0 && (
                  <button 
                    onClick={clearHistory}
                    className="text-xs text-slate-500 hover:text-red-600 px-2 py-1 rounded transition-colors"
                  >
                    清空全部
                  </button>
                )}
                <button 
                  onClick={() => setShowHistory(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {history.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <Clock className="w-12 h-12 mb-3 text-slate-200" />
                  <p>暂无生成记录</p>
                </div>
              ) : (
                history.map((item) => (
                  <div 
                    key={item.id}
                    onClick={() => loadHistoryItem(item)}
                    className="bg-slate-50 border border-slate-200 rounded-xl p-4 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group relative"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-slate-800 line-clamp-1 pr-8">
                        {item.formData.productName || item.result.titleZh || '未命名产品'}
                      </h3>
                      <button 
                        onClick={(e) => deleteHistoryItem(item.id, e)}
                        className="absolute top-4 right-4 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="删除记录"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-slate-500 mb-3 line-clamp-2">
                      {item.formData.features || item.result.descriptionZh || '无描述'}
                    </p>
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(item.timestamp).toLocaleString()}
                      </span>
                      <span className="text-indigo-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        加载此记录 &rarr;
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
