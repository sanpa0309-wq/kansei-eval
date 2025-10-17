import { useEffect, useMemo, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useSearchParams } from "react-router-dom";
import "./index.css";

/** ===== API 基底 ===== */
const API_BASE = import.meta.env.VITE_API_BASE || "/api";

/** ===== 画像セット（public/groups/g1..g5/ 配下） ===== */
const GROUP_IMAGES = {
  1: [
    "/groups/g1/Consciousness-1.png",
    "/groups/g1/Conversations-3.png",
    "/groups/g1/Identity-2.png",
    "/groups/g1/Integrity-1.png",
    "/groups/g1/Materiality-3.png",
    "/groups/g1/Relationship-2.png",
  ],
  2: [
    "/groups/g2/Consciousness-2.png",
    "/groups/g2/Evolvability-1.png",
    "/groups/g2/Identity-3.png",
    "/groups/g2/Integrity-2.png",
    "/groups/g2/Narratives-1.png",
    "/groups/g2/Relationship-3.png",
  ],
  3: [
    "/groups/g3/Consciousness-3.png",
    "/groups/g3/Evolvability-2.png",
    "/groups/g3/Imagination-1.png",
    "/groups/g3/Integrity-3.png",
    "/groups/g3/Narratives-2.png",
    "/groups/g3/比較用タンブラー画像1.png",
  ],
  4: [
    "/groups/g4/Conversations-1.png",
    "/groups/g4/Evolvability-3.png",
    "/groups/g4/Imagination-2.png",
    "/groups/g4/Materiality-1.png",
    "/groups/g4/Narratives-3.png",
    "/groups/g4/比較用タンブラー画像2.png",
  ],
  5: [
    "/groups/g5/Conversations-2.png",
    "/groups/g5/Identity-1.png",
    "/groups/g5/Imagination-3.png",
    "/groups/g5/Materiality-2.png",
    "/groups/g5/Relationship-1.png",
    "/groups/g5/比較用タンブラー画像3.png",
  ],
};

/** ===== image_id ←→ パス 相互マップ ===== */
const IMAGE_ID_MAP = (() => {
  const map = {};
  for (let g = 1; g <= 5; g++) {
    (GROUP_IMAGES[g] || []).forEach((p, i) => { map[p] = g * 100 + (i + 1); });
  }
  return map;
})();
const ID_TO_PATH = Object.fromEntries(Object.entries(IMAGE_ID_MAP).map(([p,id]) => [id, p]));

/** ===== ユーティリティ ===== */
const uid = () => Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
const shuffle = (arr) => { const a = arr.slice(); for (let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; };
const GENDER_CODE = { male: 1, female: 2, na: 0 };
const AGE_CODE = { "0-9":1,"10-19":2,"20-29":3,"30-39":4,"40-49":5,"50-59":6,"60-69":7,"70-":8,"":0 };

/** ===== participant_id 再発行ヘルパ ===== */
function renewParticipantAndGo(to) {
  const newPid = "p_" + uid();
  try { sessionStorage.setItem("participant_id", newPid); } catch {}
  location.href = to;
}

/** ===== ラベル文字サイズ（標準/大/特大） ===== */
const FONT_PRESETS = {
  normal: { label: "標準", labelFs: "15px", guideFs: "12px" },
  large:  { label: "大",   labelFs: "18px", guideFs: "13px" },
  xlarge: { label: "特大", labelFs: "20px", guideFs: "14px" },
};
function applyFontPreset(key) {
  const p = FONT_PRESETS[key] || FONT_PRESETS.normal;
  const root = document.documentElement;
  root.style.setProperty("--label-fs", p.labelFs);
  root.style.setProperty("--guide-fs", p.guideFs);
}

/** ===== スケール行（丸ボタン・数値非表示） ===== */
function ScaleRow({ pair, value, onChange }) {
  const nums = [1,2,3,4,5];
  return (
    <div className="row row--grid">
      <span className="label-left">{pair.left}</span>
      <span className="label-right">{pair.right}</span>
      <div className="btn-scale" aria-label={`${pair.left} から ${pair.right} の5段階評価`}>
        {nums.map(n => (
          <button key={n} type="button" aria-pressed={value===n} aria-label={`${n}`}
            onClick={() => onChange(n)} className={`pill ${value===n ? "pill--active":""}`} />
        ))}
      </div>
    </div>
  );
}

/** ===== セグメント（性別・年齢） ===== */
function Segmented({ label, options, value, onChange }) {
  return (
    <div className="seg-row">
      <div className="seg-label">{label}</div>
      <div className="seg-wrap">
        {options.map(opt => (
          <button key={opt.value} type="button" aria-pressed={value===opt.value}
            onClick={() => onChange(opt.value)} className={`pill seg-pill ${value===opt.value ? "pill--active":""}`}>
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** ===== アンケート："/" ===== */
function SurveyPage() {
  const [groupId, setGroupId] = useState(null);
  const [participantId, setParticipantId] = useState("anon");
  const [fontKey, setFontKey] = useState("normal");

  // 文字サイズ初期化
  useEffect(() => {
    try {
      const stored = localStorage.getItem("fontKey");
      const key = stored && FONT_PRESETS[stored] ? stored : "normal";
      setFontKey(key);
      applyFontPreset(key);
    } catch {
      setFontKey("normal");
      applyFontPreset("normal");
    }
  }, []);

  // グループの決定（サーバでグローバル管理）
  useEffect(() => {
    const decideGroup = async () => {
      try {
        const r = await fetch(`${API_BASE}/group`);
        const j = await r.json(); // { ok:true, group: 1..5 }
        if (j && Number.isFinite(Number(j.group))) {
          setGroupId(Number(j.group));
        } else {
          // フォールバック（万一）
          setGroupId(1);
        }
      } catch {
        setGroupId(1);
      }
    };
    decideGroup();

    // participant_id はタブ単位
    try {
      let pid = sessionStorage.getItem("participant_id");
      if (!pid) {
        pid = "p_" + uid();
        sessionStorage.setItem("participant_id", pid);
      }
      setParticipantId(pid);
    } catch {
      const pid = "p_" + uid();
      setParticipantId(pid);
    }
  }, []);

  const pairs = useMemo(()=>[
    { key:"modest_luxury", left:"控えめ", right:"豪華な" },
    { key:"colorful_monochrome", left:"カラフル", right:"モノクロ" },
    { key:"feminine_masculine", left:"女性らしい", right:"男性らしい" },
    { key:"complex_simple", left:"複雑な", right:"シンプルな" },
    { key:"classic_modern", left:"古典的な", right:"現代的な" },
    { key:"soft_hard", left:"柔らかい", right:"硬い" },
    { key:"heavy_light", left:"重い", right:"軽い" },
  ],[]);
  const initialValues = useMemo(()=>pairs.reduce((a,p)=>(a[p.key]=null,a),{}),[pairs]);
  const [values, setValues] = useState(initialValues);

  const genderOptions = [{label:"男性",value:"male"},{label:"女性",value:"female"},{label:"無回答",value:"na"}];
  const ageOptions = [
    {label:"0〜9歳",value:"0-9"},{label:"10〜19歳",value:"10-19"},{label:"20〜29歳",value:"20-29"},
    {label:"30〜39歳",value:"30-39"},{label:"40〜49歳",value:"40-49"},{label:"50〜59歳",value:"50-59"},
    {label:"60〜69歳",value:"60-69"},{label:"70歳〜",value:"70-"},
  ];
  const [gender, setGender] = useState("na");
  const [ageBucket, setAgeBucket] = useState("");

  const [images, setImages] = useState([]);
  useEffect(()=>{ if (groupId) setImages(shuffle(GROUP_IMAGES[groupId]||[])); },[groupId]);

  const [index, setIndex] = useState(0);
  const [records, setRecords] = useState([]);
  const currentImage = images[index] || null;

  const setVal = (k,v)=> setValues(prev=>({...prev,[k]:v}));
  const resetValuesForNext = ()=>{ setValues(initialValues); window.scrollTo({top:0,behavior:"smooth"}); };

  const restoreValuesFromRecord = (rec) => {
    if (!rec) return;
    setValues({
      modest_luxury: rec.modest_luxury ?? null,
      colorful_monochrome: rec.colorful_monochrome ?? null,
      feminine_masculine: rec.feminine_masculine ?? null,
      complex_simple: rec.complex_simple ?? null,
      classic_modern: rec.classic_modern ?? null,
      soft_hard: rec.soft_hard ?? null,
      heavy_light: rec.heavy_light ?? null,
    });
  };

  const allValuesSelected = useMemo(()=>pairs.every(p=>values[p.key]!=null),[pairs,values]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const postOne = async (row) => {
    try {
      const r = await fetch(`${API_BASE}/submit`, {
        method: "POST", headers: { "Content-Type":"application/json" }, body: JSON.stringify(row)
      });
      await r.text();
    } catch(e){ console.warn("submit ignored:", e); }
  };

  const imageIdFromPath = (p)=> (p in IMAGE_ID_MAP ? IMAGE_ID_MAP[p] : null);

  const handleNext = async () => {
    if (!currentImage || !groupId) return;
    if (index===0 && ageBucket==="") return;
    if (!allValuesSelected) return;

    const nowIso = new Date().toISOString();
    const trialNo = index + 1;

    const row = {
      timestamp: nowIso,
      participant_id: participantId,
      group_id: groupId,
      trial_no: trialNo,
      image_id: Number(imageIdFromPath(currentImage)),
      gender: Number(GENDER_CODE[gender] ?? 0),
      age_bucket: Number(AGE_CODE[ageBucket] ?? 0),
      modest_luxury: values.modest_luxury,
      colorful_monochrome: values.colorful_monochrome,
      feminine_masculine: values.feminine_masculine,
      complex_simple: values.complex_simple,
      classic_modern: values.classic_modern,
      soft_hard: values.soft_hard,
      heavy_light: values.heavy_light,
      key: `${nowIso}__${participantId}__g${groupId}__t${trialNo}`,
    };

    setIsSubmitting(true); await postOne(row); setIsSubmitting(false);
    setRecords(prev=>[...prev,row]);

    // 自分の回答をローカル保存（/image での黄色フォールバック）
    try {
      const byPidKey = `${row.participant_id}::${row.image_id}`;
      const byPid = JSON.parse(sessionStorage.getItem("answersByImage") || "{}");
      byPid[byPidKey] = {
        modest_luxury: row.modest_luxury,
        colorful_monochrome: row.colorful_monochrome,
        feminine_masculine: row.feminine_masculine,
        complex_simple: row.complex_simple,
        classic_modern: row.classic_modern,
        soft_hard: row.soft_hard,
        heavy_light: row.heavy_light,
      };
      sessionStorage.setItem("answersByImage", JSON.stringify(byPid));
      const byImage = JSON.parse(sessionStorage.getItem("answersByImageLatest") || "{}");
      byImage[String(row.image_id)] = byPid[byPidKey];
      sessionStorage.setItem("answersByImageLatest", JSON.stringify(byImage));
    } catch {}

    if (index+1 < images.length) { setIndex(i=>i+1); resetValuesForNext(); }
    else { setIndex(images.length); window.scrollTo({top:0,behavior:"smooth"}); }
  };

  const handleBack = () => {
    if (index===0) return;
    if (index===images.length) {
      setRecords(prev=>{ const last=prev[prev.length-1]; const next=prev.slice(0,-1); restoreValuesFromRecord(last); return next; });
      setIndex(images.length-1); return;
    }
    setRecords(prev=>{
      if (prev.length===index) { const last=prev[prev.length-1]; const next=prev.slice(0,-1); restoreValuesFromRecord(last); return next; }
      else { restoreValuesFromRecord(prev[prev.length-1]); return prev.slice(0,-1); }
    });
    setIndex(i=>Math.max(0,i-1));
  };

  const handleResetAll = () => {
    setValues(initialValues);
    setGender("na");
    setAgeBucket("");
    setIndex(0);
    setRecords([]);
    const newPid = "p_" + uid();
    try { sessionStorage.setItem("participant_id", newPid); } catch {}
    location.reload();
  };

  const allDone = images.length>0 && index>=images.length;
  const canSubmit = currentImage && allValuesSelected && (index!==0 || ageBucket!== "");

  return (
    <div className="page">
      {/* 文字サイズの即時反映用インラインルール（index.cssの後に読むので上書き可能） */}
      <style>{`
        .label-left, .label-right { font-size: var(--label-fs, 15px) !important; }
        .head-grid-5 span { font-size: var(--guide-fs, 12px) !important; }
      `}</style>

      <header className="topbar">
        <h1 className="title">感性評価</h1>
        <p className="subtitle">
          {groupId ? `グループ: ${groupId} ／ 画像 ${Math.min(index+1, images.length)} / ${images.length}` : "グループ決定中…"}
        </p>
      </header>

      {/* 文字サイズ切り替え（老人向け） */}
      <section className="card" style={{ paddingTop: 10, paddingBottom: 10 }}>
        <div className="seg-row">
          <div className="seg-label">文字サイズ</div>
          <div className="seg-wrap">
            {Object.entries(FONT_PRESETS).map(([key, conf]) => (
              <button
                key={key}
                type="button"
                aria-pressed={fontKey===key}
                onClick={() => { setFontKey(key); applyFontPreset(key); try{localStorage.setItem("fontKey", key);}catch{} }}
                className={`pill seg-pill ${fontKey===key ? "pill--active":""}`}
              >
                {conf.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* アンケート本編 or サンクス */}
      {groupId && !allDone && (
        <>
          <section className="card">
            <div className="img-wrap">
              {currentImage ? <img src={currentImage} alt="タンブラー画像" className="stimulus" /> :
                <div style={{padding:16,color:"#666",fontSize:14}}>画像が見つかりません</div>}
            </div>
          </section>

          {index===0 && (
            <section className="card">
              <Segmented label="性別" options={genderOptions} value={gender} onChange={setGender}/>
              <Segmented label="年齢" options={ageOptions} value={ageBucket} onChange={setAgeBucket}/>
            </section>
          )}

          <section className="card">
            <div className="scale-head global five">
              <div className="head-grid-5">
                <span className="head-1">非常にそう思う</span>
                <span className="head-2">そう思う</span>
                <span className="head-3">どちらでもない</span>
                <span className="head-4">そう思う</span>
                <span className="head-5">非常にそう思う</span>
              </div>
            </div>
            {pairs.map(p=>(
              <ScaleRow key={p.key} pair={p} value={values[p.key]} onChange={(v)=>setVal(p.key,v)} />
            ))}
          </section>

          <div className="submit-bar">
            <button type="button" className="btn-secondary" onClick={handleBack} disabled={index===0} style={{opacity:index===0?0.5:1}}>戻る</button>
            <button type="button" className="btn-primary" onClick={handleNext} disabled={!canSubmit || isSubmitting} style={{opacity:!canSubmit||isSubmitting?0.5:1}}>
              {index+1<images.length ? (isSubmitting?"送信中…":"次へ") : (isSubmitting?"送信中…":"完了")}
            </button>
          </div>
        </>
      )}

      {groupId && allDone && (
        <section className="card" style={{ textAlign:"center", padding:"32px 16px" }}>
          <h2 style={{marginTop:0, marginBottom:8}}>ご回答ありがとうございました。</h2>
          <p style={{color:"#666", marginTop:0, marginBottom:24}}>ご協力に感謝いたします。</p>
          <div className="submit-bar" style={{ marginTop:8 }}>
            <button type="button" className="btn-secondary" onClick={handleResetAll}>最初からやり直す</button>
            <Link className="btn-primary as-link" to={`/results?g=${groupId}`}>みんなの結果を見る</Link>
          </div>
        </section>
      )}
    </div>
  );
}

/** ===== 結果一覧："/results" ===== */
function ResultsPage() {
  const [searchParams] = useSearchParams();
  const g = Number(searchParams.get("g") || "1");
  const images = useMemo(() => (GROUP_IMAGES[g] || []), [g]);

  if (!(g >= 1 && g <= 5)) {
    return (
      <div className="page results">
        <h1>グループ {String(searchParams.get("g") || "")} の結果</h1>
        <section className="card">不正なグループです。</section>
        <div style={{ marginTop: 16 }}>
          <button className="btn-secondary" onClick={() => renewParticipantAndGo("/")}>アンケートに戻る</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page results">
      <h1>グループ {g} の結果</h1>
       {/* ← 追加：案内テキスト（分布ページの注記と同じ大きさ/色） */}
      <p style={{ textAlign: "center", marginTop: 8, marginBottom: 12, fontSize: 14, color: "#666" }}>
        結果が気になる画像をタップしてください。
      </p>
      <section className="card">
        <div className="grid">
          {images.map((imgPath) => {
            const image_id = IMAGE_ID_MAP[imgPath];
            if (image_id == null) return null;
            const href = `/image?g=${g}&image_id=${encodeURIComponent(image_id)}`;
            const rememberPath = () => {
              try {
                const map = JSON.parse(sessionStorage.getItem("imgMap") || "{}");
                map[String(image_id)] = imgPath;
                sessionStorage.setItem("imgMap", JSON.stringify(map));
              } catch {}
            };
            return (
              <a className="card-thumb" href={href} key={image_id} onClick={rememberPath}>
                <div className="thumb"><img loading="lazy" src={imgPath} alt="" /></div>
              </a>
            );
          })}
        </div>
        <div style={{ marginTop: 16 }}>
          <button className="btn-secondary" onClick={() => renewParticipantAndGo("/")}>アンケートに戻る</button>
        </div>
      </section>
    </div>
  );
}

/** ===== 画像別分布："/image" ===== */
function ImagePage() {
  const [searchParams] = useSearchParams();
  const g = Number(searchParams.get("g") || "1");
  const image_id = searchParams.get("image_id");
  const [meta, setMeta] = useState({ path: null });
  const [dist, setDist] = useState(null);
  const [userValue, setUserValue] = useState(null);

  useEffect(() => {
    const run = async () => {
      try {
        const pid = sessionStorage.getItem("participant_id") || "";
        const url = new URL(`${API_BASE}/summary`, location.origin);
        url.searchParams.set("mode", "image");
        url.searchParams.set("g", String(g));
        url.searchParams.set("image_id", String(image_id));
        if (pid) url.searchParams.set("pid", pid);

        const r = await fetch(url.toString());
        const json = await r.json();
        setDist(json || null);

        // user_value: サーバ → (pid,image)ローカル → imageローカル
        let uv = json?.user_value || null;
        try {
          if (!uv) {
            const byPid = JSON.parse(sessionStorage.getItem("answersByImage") || "{}");
            uv = byPid[`${pid}::${String(image_id)}`] || null;
          }
          if (!uv) {
            const byImage = JSON.parse(sessionStorage.getItem("answersByImageLatest") || "{}");
            uv = byImage[String(image_id)] || null;
          }
        } catch {}
        if (uv) {
          const norm = {};
          for (const k of ["modest_luxury","colorful_monochrome","feminine_masculine","complex_simple","classic_modern","soft_hard","heavy_light"]) {
            const v = uv[k];
            norm[k] = (v == null ? null : Number(v));
          }
          setUserValue(norm);
        } else {
          setUserValue(null);
        }

        let p = json?.image || json?.image_path || null;
        if (!p) p = ID_TO_PATH[Number(image_id)] || null;
        if (!p) {
          try {
            const map = JSON.parse(sessionStorage.getItem("imgMap") || "{}");
            p = map[String(image_id)] || null;
          } catch {}
        }
        setMeta({ path: p });
      } catch (e) {
        console.error(e); setDist(null); setMeta({ path: null });
      }
    };
    if (g>=1 && g<=5 && image_id) run();
  }, [g, image_id]);

  const PAIRS = [
    { key:"modest_luxury", left:"控えめ", right:"豪華な" },
    { key:"colorful_monochrome", left:"カラフル", right:"モノクロ" },
    { key:"feminine_masculine", left:"女性らしい", right:"男性らしい" },
    { key:"complex_simple", left:"複雑な", right:"シンプルな" },
    { key:"classic_modern", left:"古典的な", right:"現代的な" },
    { key:"soft_hard", left:"柔らかい", right:"硬い" },
    { key:"heavy_light", left:"重い", right:"軽い" },
  ];

  // 自分の値を黄色で塗る棒グラフ（SVG）
  const BarRow = ({ pair, bins, myVal }) => {
    const max = Math.max(1, ...bins);
    const W = 360, H = 120, pad = 8;
    const colW = (W - pad * 2) / 5;
    const my = Number(myVal);
    const rects = bins.map((n,i)=>{
      const h = Math.round((n/max) * (H - pad*2 - 18));
      const x = pad + i*colW + colW*0.15;
      const bw = colW*0.7;
      const y = H - pad - h;
      const isUser = my === (i + 1);
      const color = isUser ? "#facc15" : "#2563eb";
      return `<rect x="${x}" y="${y}" width="${bw}" height="${h}" rx="3" ry="3" fill="${color}" />`;
    }).join("");
    const svg = { __html:
      `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" style="width:100%;height:auto;display:block">
         ${rects}
       </svg>` };
    return (
      <div className="row">
        <div className="label left">{pair.left}</div>
        <div className="bars">
          <div dangerouslySetInnerHTML={svg} />
          <div className="ticks"><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span></div>
        </div>
        <div className="label right">{pair.right}</div>
      </div>
    );
  };

  const rows = (dist && dist.counts)
    ? PAIRS.map(p=>{
        const c = dist.counts[p.key] || {};
        const bins = [1,2,3,4,5].map(v => Number(c[String(v)] || 0));
        const myVal = userValue?.[p.key] ?? null;
        return <BarRow key={p.key} pair={p} bins={bins} myVal={myVal} />;
      })
    : <div>読み込み中…</div>;

  return (
    <div className="page image">
      <header className="topbar">
        <h1 className="title">分布グラフ</h1>
        <p className="subtitle">{g ? `グループ ${g}` : ""}</p>
      </header>

      <section className="card">
        <div className="img-wrap">
          {meta.path ? <img src={meta.path} alt="" className="stimulus" /> : <div className="ph">画像なし</div>}
        </div>
      </section>

      <p style={{ textAlign: "center", marginTop: 8, marginBottom: 12, fontSize: 14, color: "#666" }}>
        ※黄色のグラフがあなたの回答
      </p>

      <section className="card rows-card">
        {rows}
      </section>

      <div className="submit-bar">
        <Link to={`/results?g=${g}`} className="btn-secondary as-link">一覧に戻る</Link>
        <button className="btn-primary" onClick={() => renewParticipantAndGo("/")}>アンケートへ</button>
      </div>
    </div>
  );
}

/** ===== ルート定義 ===== */
export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<SurveyPage />} />
        <Route path="/results" element={<ResultsPage />} />
        <Route path="/image" element={<ImagePage />} />
      </Routes>
    </Router>
  );
}
