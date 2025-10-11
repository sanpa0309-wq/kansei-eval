import { useEffect, useMemo, useState } from "react";

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

/** ===== API 基底（本番は /api、ローカルは .env.local でVITE_API_BASEを指定可） ===== */
const API_BASE = import.meta.env.VITE_API_BASE || "/api";

/** ===== Cookie helpers（安全版）===== */
function getCookie(name) {
  if (typeof document === "undefined") return null;
  const arr = document.cookie ? document.cookie.split(";") : [];
  for (const raw of arr) {
    const [k, ...rest] = raw.trim().split("=");
    if (decodeURIComponent(k) === name) {
      return decodeURIComponent(rest.join("="));
    }
  }
  return null;
}
function setCookie(name, value, days = 365) {
  if (typeof document === "undefined") return;
  const d = new Date();
  d.setTime(d.getTime() + days * 864e5);
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(
    value
  )}; path=/; expires=${d.toUTCString()}`;
}

/** ===== ユーティリティ ===== */
const uid = () => Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// 数値化マップ（送信を軽く）
const GENDER_CODE = { male: 1, female: 2, na: 0 };
const AGE_CODE = {
  "0-9": 1, "10-19": 2, "20-29": 3, "30-39": 4, "40-49": 5,
  "50-59": 6, "60-69": 7, "70-": 8, "": 0
};

/** ===== 5段階スケール行（丸ボタン、数値は表示しない）===== */
function ScaleRow({ pair, value, onChange }) {
  const nums = [1, 2, 3, 4, 5];
  return (
    <div className="row row--grid">
      <span className="label-left">{pair.left}</span>
      <span className="label-right">{pair.right}</span>

      <div className="btn-scale" aria-label={`${pair.left} から ${pair.right} の5段階評価`}>
        {nums.map((n) => {
          const selected = value === n;
          return (
            <button
              key={n}
              type="button"
              aria-pressed={selected}
              aria-label={`${n}`}
              onClick={() => onChange(n)}
              className={`pill ${selected ? "pill--active" : ""}`}
            />
          );
        })}
      </div>
    </div>
  );
}

/** ===== セグメントボタン（性別・年齢・グループ） ===== */
function Segmented({ label, options, value, onChange }) {
  return (
    <div className="seg-row">
      <div className="seg-label">{label}</div>
      <div className="seg-wrap">
        {options.map((opt) => {
          const selected = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(opt.value)}
              className={`pill seg-pill ${selected ? "pill--active" : ""}`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** ====== ページ：アンケート本編 ====== */
function SurveyPage() {
  // 初期 group 決定（?group=…優先、それ以外は「ほぼ均等」ローテ）
  const [groupId, setGroupId] = useState(null);
  const [lockedByQuery, setLockedByQuery] = useState(false);
  const [participantId, setParticipantId] = useState("anon");

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const qg = params.get("group");
    const g = qg ? parseInt(qg, 10) : null;
    if (g && g >= 1 && g <= 5) {
      setGroupId(g);
      setLockedByQuery(true);
    } else {
      // lastGroup を cookie で保持して「ほぼ均等」を実現（1→2→…→5→1…）
      const last = parseInt(getCookie("lastGroup") || "0", 10);
      const next = ((isNaN(last) ? 0 : last) % 5) + 1;
      setGroupId(next);
      setCookie("lastGroup", String(next));
    }
    const pid = params.get("pid");
    if (pid) setParticipantId(String(pid));
    else {
      // 既存 participant_id が無ければ採番
      const saved = getCookie("participant_id");
      if (saved) setParticipantId(saved);
      else {
        const p = "p_" + uid();
        setParticipantId(p);
        setCookie("participant_id", p);
      }
    }
  }, []);

  // 感性語ペア（文言調整：男性/女性・古典的/現代的）
  const pairs = useMemo(
    () => [
      { key: "modest_luxury", left: "控えめ", right: "豪華な" },
      { key: "colorful_monochrome", left: "カラフル", right: "モノクロ" },
      { key: "feminine_masculine", left: "女性らしい", right: "男性らしい" },
      { key: "complex_simple", left: "複雑な", right: "シンプルな" },
      { key: "classic_modern", left: "古典的な", right: "現代的な" },
      { key: "soft_hard", left: "柔らかい", right: "硬い" },
      { key: "heavy_light", left: "重い", right: "軽い" },
    ],
    []
  );

  const initialValues = useMemo(
    () => pairs.reduce((acc, p) => ((acc[p.key] = null), acc), {}),
    [pairs]
  );
  const [values, setValues] = useState(initialValues);

  // 性別：ラベルを「男性・女性」に変更
  const genderOptions = [
    { label: "男性", value: "male" },
    { label: "女性", value: "female" },
    { label: "無回答", value: "na" },
  ];
  const ageOptions = [
    { label: "0〜9歳", value: "0-9" },
    { label: "10〜19歳", value: "10-19" },
    { label: "20〜29歳", value: "20-29" },
    { label: "30〜39歳", value: "30-39" },
    { label: "40〜49歳", value: "40-49" },
    { label: "50〜59歳", value: "50-59" },
    { label: "60〜69歳", value: "60-69" },
    { label: "70歳〜", value: "70-" },
  ];
  const [gender, setGender] = useState("na");
  const [ageBucket, setAgeBucket] = useState("");

  // 画像群（ランダム順）
  const [images, setImages] = useState([]);
  useEffect(() => {
    if (!groupId) return;
    setImages(shuffle(GROUP_IMAGES[groupId] || []));
  }, [groupId]);

  const [index, setIndex] = useState(0);
  const [records, setRecords] = useState([]); // 送信済みレコード
  const currentImage = images[index] || null;
  const setVal = (key, v) => setValues((prev) => ({ ...prev, [key]: v }));

  const resetValuesForNext = () => {
    setValues(initialValues);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // 前のレコードから復元（戻る用）
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
    if (rec.gender_code != null) setGender(rec.gender_code === 2 ? "female" : rec.gender_code === 1 ? "male" : "na");
    // age は見た目用の value を復元しない（初回だけ選択）
  };

  const allValuesSelected = useMemo(
    () => pairs.every((p) => values[p.key] !== null && values[p.key] !== undefined),
    [pairs, values]
  );

  // === 送信：/api/submit（GAS 経由） ===
  const [isSubmitting, setIsSubmitting] = useState(false);

  const postOne = async (row) => {
    try {
      const r = await fetch(`${API_BASE}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(row),
      });
      await r.text(); // GASからのテキストJSON（無視可）
    } catch (e) {
      console.warn("submit failed (ignored):", e);
    }
  };

  // 画像ID（GAS側で id 採番してる場合に備え、pathから簡易ハッシュ）
  const imageIdFromPath = (p) => {
    if (!p) return null;
    let h = 0;
    for (let i = 0; i < p.length; i++) {
      h = (h * 31 + p.charCodeAt(i)) >>> 0;
    }
    // 100〜999の範囲に丸め（ダッシュボードの例に近い数）
    return 100 + (h % 900);
  };

  const handleNext = async () => {
    if (!currentImage || !groupId) return;
    if (index === 0 && ageBucket === "") return; // 初回は年齢必須
    if (!allValuesSelected) return; // 全項目必須

    const nowIso = new Date().toISOString();
    const trialNo = index + 1;

    // 数値化して送る（gender/age_bucket を code で）
    const row = {
      timestamp: nowIso,
      participant_id: participantId,
      group_id: groupId,
      trial_no: trialNo,
      image: currentImage,              // 文字列（GAS側で保持）
      image_id: imageIdFromPath(currentImage), // 追加：数値ID（重複対策にも可）
      gender_code: GENDER_CODE[gender] ?? 0,
      age_code: AGE_CODE[ageBucket] ?? 0,
      modest_luxury: values.modest_luxury,
      colorful_monochrome: values.colorful_monochrome,
      feminine_masculine: values.feminine_masculine,
      complex_simple: values.complex_simple,
      classic_modern: values.classic_modern,
      soft_hard: values.soft_hard,
      heavy_light: values.heavy_light,
      key: `${nowIso}__${participantId}__g${groupId}__t${trialNo}`, // GAS 側の重複スキップにヒット
    };

    setIsSubmitting(true);
    await postOne(row);
    setIsSubmitting(false);

    setRecords((prev) => [...prev, row]);

    if (index + 1 < images.length) {
      setIndex((i) => i + 1);
      resetValuesForNext();
    } else {
      setIndex(images.length); // 完了
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // 戻る
  const handleBack = () => {
    if (index === 0) return;

    if (index === images.length) {
      setRecords((prev) => {
        const last = prev[prev.length - 1];
        const next = prev.slice(0, -1);
        restoreValuesFromRecord(last);
        return next;
      });
      setIndex(images.length - 1);
      return;
    }

    setRecords((prev) => {
      if (prev.length === index) {
        const last = prev[prev.length - 1];
        const next = prev.slice(0, -1);
        restoreValuesFromRecord(last);
        return next;
      } else {
        restoreValuesFromRecord(prev[prev.length - 1]);
        return prev.slice(0, -1);
      }
    });
    setIndex((i) => Math.max(0, i - 1));
  };

  // すべてリセット（最初に戻る）→ 新しい participant_id を発行
  const handleResetAll = () => {
    setValues(initialValues);
    setGender("na");
    setAgeBucket("");
    setIndex(0);
    setRecords([]);
    const p = "p_" + uid();
    setParticipantId(p);
    setCookie("participant_id", p);
    if (!lockedByQuery) setGroupId(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const allDone = images.length > 0 && index >= images.length;
  const canSubmit = currentImage && allValuesSelected && (index !== 0 || ageBucket !== "");

  return (
    <div className="page">
      <header className="topbar">
        <h1 className="title">感性評価</h1>
        <p className="subtitle">
          {groupId
            ? `グループ: ${groupId} ／ 画像 ${Math.min(index + 1, images.length)} / ${images.length}`
            : "最初に評価グループを選んでください"}
        </p>
      </header>

      {/* グループ選択（?group= が無いときのみ） */}
      {!groupId && (
        <section className="card">
          <Segmented
            label="評価グループ"
            options={[1,2,3,4,5].map(n => ({label:String(n), value:n}))}
            value={null}
            onChange={(g) => {
              setGroupId(g);
              const p = new URLSearchParams(location.search);
              p.set("group", String(g));
              history.replaceState(null, "", `${location.pathname}?${p.toString()}`);
              setIndex(0);
              setRecords([]);
              setValues(initialValues);
              setCookie("lastGroup", String(g));
            }}
          />
        </section>
      )}

      {/* 本編 or サンクス */}
      {groupId && !allDone && (
        <>
          <section className="card">
            <div className="card-head">
              <strong>タンブラー画像</strong>
              {!lockedByQuery && (
                <button type="button" className="btn-ghost" onClick={() => setGroupId(null)} title="グループを選び直す">
                  グループ変更
                </button>
              )}
            </div>
            <div className="img-wrap">
              {currentImage ? (
                <img src={currentImage} alt="タンブラー画像" className="stimulus" />
              ) : (
                <div style={{ padding: 16, color: "#666", fontSize: 14 }}>
                  画像が見つかりません（グループ{groupId}の画像配列を確認してください）
                </div>
              )}
            </div>
          </section>

          {/* 初回のみ：性別・年齢 */}
          {index === 0 && (
            <section className="card">
              <Segmented label="性別" options={genderOptions} value={gender} onChange={setGender} />
              <Segmented label="年齢" options={ageOptions} value={ageBucket} onChange={setAgeBucket} />
            </section>
          )}

          {/* ガイド（1〜5は文言のみ・数値表示なし） */}
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

            {pairs.map((p) => (
              <ScaleRow key={p.key} pair={p} value={values[p.key]} onChange={(v) => setVal(p.key, v)} />
            ))}
          </section>

          <div className="submit-bar">
            <button type="button" className="btn-secondary" onClick={handleBack} disabled={index === 0} style={{ opacity: index === 0 ? 0.5 : 1 }}>
              戻る
            </button>
            <button type="button" className="btn-primary" onClick={handleNext} disabled={!canSubmit || isSubmitting} style={{ opacity: !canSubmit || isSubmitting ? 0.5 : 1 }}>
              {index + 1 < images.length ? (isSubmitting ? "送信中…" : "次へ") : (isSubmitting ? "送信中…" : "完了")}
            </button>
          </div>
        </>
      )}

      {/* 完了 → 「みんなの結果を見る」へ */}
      {groupId && allDone && (
        <section className="card" style={{ textAlign: "center", padding: "32px 16px" }}>
          <h2 style={{ marginTop: 0, marginBottom: 8 }}>ご回答ありがとうございました。</h2>
          <p style={{ color: "#666", marginTop: 0, marginBottom: 24 }}>ご協力に感謝いたします。</p>
          <div className="submit-bar" style={{ marginTop: 8 }}>
            <button type="button" className="btn-secondary" onClick={handleResetAll}>最初からやり直す</button>
            <a className="btn-primary as-link" href={`/results?g=${groupId}`}>みんなの結果を見る</a>
          </div>
        </section>
      )}
    </div>
  );
}

/** ====== ページ：グループ一覧（画像サムネの羅列） ====== */
function ResultsPage() {
  const params = new URLSearchParams(location.search);
  const g = parseInt(params.get("g") || "0", 10);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  // 初回だけ読み込んでスナップショット表示（軽さ優先）
  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const r = await fetch(`${API_BASE}/summary?mode=list&g=${encodeURIComponent(g)}`);
        const json = await r.json();
        // GAS が image_id or image の両方を返すのでそのまま保持
        setList(json.images || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    if (g >= 1 && g <= 5) run();
  }, [g]);

  return (
    <div className="page">
      <header className="topbar">
        <h1 className="title">みんなの結果（グループ{g}）</h1>
        <p className="subtitle">画像を選ぶと分布グラフが見られます</p>
      </header>

      <section className="card">
        {loading && <div>読み込み中…</div>}
        {!loading && (
          <div className="grid">
            {(list || []).map((rec, i) => {
              const id = rec.image_id ?? null;
              const path = rec.image ?? null;
              const name = (path || `id-${id}` || `#${i}`).split("/").pop()?.replace(/\.[^.]+$/,"");
              const href = id != null
                ? `/image?g=${g}&image_id=${encodeURIComponent(id)}`
                : `/image?g=${g}&image=${encodeURIComponent(path || "")}`;
              const imgSrc = path || ""; // サムネは path があるときのみ表示
              return (
                <a className="card-thumb" href={href} key={`${id ?? path ?? i}`}>
                  <div className={`thumb ${imgSrc.includes("/g") ? "" : ""}`}>
                    {imgSrc ? <img loading="lazy" src={imgSrc} alt={name} /> : <div className="ph">NO PREVIEW</div>}
                  </div>
                  <div className="iname" title={name}>{name}</div>
                </a>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

/** ====== ページ：画像別分布（棒グラフのみ／件数非表示） ====== */
function ImagePage() {
  const params = new URLSearchParams(location.search);
  const g = parseInt(params.get("g") || "0", 10);
  const image_id = params.get("image_id");
  const image = params.get("image");

  const [dist, setDist] = useState(null); // { counts: {pair: {'1':n..'5':n}} }
  const [meta, setMeta] = useState({ path: null });

  useEffect(() => {
    const run = async () => {
      const url = new URL(`${API_BASE}/summary`);
      url.searchParams.set("mode", "image");
      url.searchParams.set("g", String(g));
      if (image_id) url.searchParams.set("image_id", String(image_id));
      else if (image) url.searchParams.set("image", String(image));
      const r = await fetch(url.toString(), { method: "GET" });
      const json = await r.json();
      setDist(json || null);

      // パスの判定（GAS側の出力構造に合わせて推測）
      const p = json?.image || json?.image_path || image || null;
      setMeta({ path: p });
    };
    if (g >= 1 && g <= 5 && (image_id || image)) run();
  }, [g, image_id, image]);

  // 簡易レンダラー（SVG棒グラフ／件数は描かない）
  const PAIRS = [
    { key: "modest_luxury", left: "控えめ", right: "豪華な" },
    { key: "colorful_monochrome", left: "カラフル", right: "モノクロ" },
    { key: "feminine_masculine", left: "女性らしい", right: "男性らしい" },
    { key: "complex_simple", left: "複雑な", right: "シンプルな" },
    { key: "classic_modern", left: "古典的な", right: "現代的な" },
    { key: "soft_hard", left: "柔らかい", right: "硬い" },
    { key: "heavy_light", left: "重い", right: "軽い" },
  ];

  const BarRow = ({ pair, bins }) => {
    const total = bins.reduce((a,b)=>a+b,0);
    const max = Math.max(1, ...bins);
    const W = 360, H = 140, pad = 8;
    const colW = (W - pad*2) / 5;
    const rects = bins.map((n,i)=>{
      const h = Math.round((n/max) * (H - pad*2 - 18));
      const x = pad + i*colW + colW*0.15;
      const bw = colW*0.7;
      const y = H - pad - h;
      return `<rect x="${x}" y="${y}" width="${bw}" height="${h}" rx="3" ry="3" />`;
    }).join("");

    const svg = { __html: `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><g fill="#2563eb">${rects}</g></svg>` };

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

  // dist から対ごとの bins を作る
  const rows = (dist && dist.counts)
    ? PAIRS.map(p => {
        const c = dist.counts[p.key] || {};
        const bins = [1,2,3,4,5].map(v => Number(c[String(v)] || 0));
        return <BarRow key={p.key} pair={p} bins={bins} />;
      })
    : <div>読み込み中…</div>;

  const back = `/results?g=${g}`;

  const name = (meta?.path || "").split("/").pop()?.replace(/\.[^.]+$/,"") || (image_id ? `id-${image_id}` : "");

  return (
    <div className="page">
      <header className="topbar">
        <h1 className="title">分布グラフ</h1>
        <p className="subtitle">画像: {name}{g ? ` ／ グループ ${g}` : ""}</p>
      </header>

      <section className="card">
        <div className="img-wrap">
          {meta?.path ? (
            <img className="stimulus" src={meta.path} alt="" />
          ) : (
            <div style={{ padding: 16, color: "#666" }}>画像不明</div>
          )}
        </div>
      </section>

      <section className="card rows-card">
        {rows}
      </section>

      <div className="submit-bar">
        <a href={back} className="btn-secondary as-link">一覧に戻る</a>
        <a href="/" className="btn-primary as-link">最初の画面へ</a>
      </div>
    </div>
  );
}

/** ===== ルーティング（超シンプル：pathnameで分岐） ===== */
export default function App() {
  const path = location.pathname || "/";
  if (path === "/results") return <ResultsPage />;
  if (path === "/image")   return <ImagePage />;
  return <SurveyPage />;
}
