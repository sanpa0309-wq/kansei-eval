import { useEffect, useMemo, useState } from "react";

/** ===== SheetsのURL ===== */
const SHEETS_ENDPOINT = "https://script.google.com/macros/s/AKfycbwiHh-U_jsyKmUsewEzAiHTkAI4YWcCcfVXSMsX0IQrZtFF6LD1uaxLxBpdo93LPMk/exec";

/** ===== 送信キュー（オフライン対応）＆送信済みkey管理 ===== */
const QUEUE_KEY = "kansei_pending_rows";
const SENT_KEYS_KEY = "kansei_sent_keys";

function loadQueue() { try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]"); } catch { return []; } }
function saveQueue(q) { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); }

function loadSentKeys() { try { return new Set(JSON.parse(localStorage.getItem(SENT_KEYS_KEY) || "[]")); } catch { return new Set(); } }
function saveSentKeys(set) { localStorage.setItem(SENT_KEYS_KEY, JSON.stringify(Array.from(set))); }

async function flushQueue(endpoint = SHEETS_ENDPOINT) {
  let q = loadQueue();
  if (!q.length) return;
  const next = [];
  for (const row of q) {
    try {
      await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, mode: "no-cors", body: JSON.stringify(row) });
    } catch (e) {
      console.error("repost failed, keep in queue:", e);
      next.push(row);
    }
  }
  saveQueue(next);
}
window.addEventListener("online", () => flushQueue());

/** ===== 画像セット ===== */
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

/** 7段階の評価行（0〜6） */
function ScaleRow({ pair, value, onChange }) {
  const nums = [0, 1, 2, 3, 4, 5, 6];
  return (
    <div className="row row--grid">
      <span className="label-left">{pair.left}</span>
      <div className="btn-scale">
        {nums.map((n) => {
          const selected = value === n;
          return (
            <button
              key={n}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(n)}
              className={`pill ${selected ? "pill--active" : ""}`}
            >
              {n}
            </button>
          );
        })}
      </div>
      <span className="label-right">{pair.right}</span>
    </div>
  );
}

/** 横並びボタン（性別・年齢・グループ） */
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

/** CSV ダウンロード（ローカル予備） */
function downloadCSV(rows) {
  if (!rows.length) return;
  const headers = [
    "timestamp","participant_id","group_id","trial_no","image","gender","age_bucket",
    "modest_luxury","colorful_monochrome","feminine_masculine","complex_simple",
    "classic_modern","soft_hard","heavy_light","user_agent","uid","key"
  ];
  const esc = (v) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const csv = headers.join(",") + "\n" + rows.map(r => headers.map(h => esc(r[h])).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const date = new Date().toISOString().replace(/[:.]/g, "-");
  a.href = url;
  a.download = `kansei_results_${date}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/** uid 生成（古いブラウザ用フォールバック） */
function makeUid() {
  if (crypto && crypto.randomUUID) return crypto.randomUUID();
  return "uid-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
}

/** 回答の決定的 key を生成 */
function makeKey({ participantId, groupId, trialNo, imagePath }) {
  const pid = participantId || "anon";
  return `${pid}|g${groupId}|t${trialNo}|img:${imagePath}`;
}

export default function App() {
  // URL: ?group=1..5 / ?pid=xxx
  const [groupId, setGroupId] = useState(null);
  const params = new URLSearchParams(location.search);
  const participantId = params.get("pid") || null;

  useEffect(() => {
    const q = params.get("group");
    const g = q ? parseInt(q, 10) : null;
    if (g && g >= 1 && g <= 5) setGroupId(g);
  }, []);

  // 感性語対
  const pairs = useMemo(
    () => [
      { key: "modest_luxury", left: "控えめ", right: "豪華な" },
      { key: "colorful_monochrome", left: "カラフル", right: "モノクロ" },
      { key: "feminine_masculine", left: "女性ぽい", right: "男性ぽい" },
      { key: "complex_simple", left: "複雑な", right: "シンプルな" },
      { key: "classic_modern", left: "クラシックな", right: "モダンな" },
      { key: "soft_hard", left: "柔らかい", right: "硬い" },
      { key: "heavy_light", left: "重い", right: "軽い" },
    ],
    []
  );

  // 初期値：中央（3）
  const initialValues = useMemo(() => pairs.reduce((a,p)=> (a[p.key]=3, a), {}), [pairs]);

  const [values, setValues] = useState(initialValues);

  // 性別・年齢（1ページ目のみ表示）
  const genderOptions = [
    { label: "男", value: "male" },
    { label: "女", value: "female" },
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

  // 画像群
  const images = useMemo(() => (!groupId ? [] : (GROUP_IMAGES[groupId] ?? [])), [groupId]);
  const [index, setIndex] = useState(0);
  const [records, setRecords] = useState([]); // ローカル予備
  const [sentKeys, _setSentKeys] = useState(() => loadSentKeys());
  const setSentKeys = (updater) => {
    const next = updater instanceof Function ? updater(sentKeys) : updater;
    _setSentKeys(next);
    saveSentKeys(next);
  };

  const currentImage = images[index] || null;
  const setVal = (k, v) => setValues((prev) => ({ ...prev, [k]: v }));
  const resetValuesForNext = () => { setValues(initialValues); window.scrollTo({ top: 0, behavior: "smooth" }); };

  // 戻した時に復元
  const restoreValuesFromRecord = (rec) => {
    if (!rec) return;
    setValues({
      modest_luxury: rec.modest_luxury,
      colorful_monochrome: rec.colorful_monochrome,
      feminine_masculine: rec.feminine_masculine,
      complex_simple: rec.complex_simple,
      classic_modern: rec.classic_modern,
      soft_hard: rec.soft_hard,
      heavy_light: rec.heavy_light,
    });
    if (rec.gender) setGender(rec.gender);
    if (rec.age_bucket) setAgeBucket(rec.age_bucket);
  };

  /** 連打ロック */
  const [clickLocked, setClickLocked] = useState(false);
  const CLICK_LOCK_MS = 600;

  // 次へ（決定的keyで重複防止、送信済みは再送しない）
  const handleNext = async () => {
    if (clickLocked) return;
    setClickLocked(true);
    setTimeout(() => setClickLocked(false), CLICK_LOCK_MS);

    if (!currentImage || !groupId) return;
    if (index === 0 && !ageBucket) {
      alert("年齢を選択してください。");
      return;
    }

    const trialNo = index + 1;
    const key = makeKey({ participantId, groupId, trialNo, imagePath: currentImage });

    // 既に送信した key は再送しない（連打・戻る対策）
    if (sentKeys.has(key)) {
      // UIだけ前進
      if (index + 1 < images.length) {
        setIndex((i) => i + 1);
        resetValuesForNext();
      } else {
        setIndex(images.length);
        alert("すべての画像の評価が完了しました。スプレッドシートをご確認ください。");
      }
      return;
    }

    const row = {
      timestamp: new Date().toISOString(),
      participant_id: participantId || "anon",
      group_id: groupId,
      trial_no: trialNo,
      image: currentImage,
      gender,
      age_bucket: ageBucket || null,
      modest_luxury: values.modest_luxury,
      colorful_monochrome: values.colorful_monochrome,
      feminine_masculine: values.feminine_masculine,
      complex_simple: values.complex_simple,
      classic_modern: values.classic_modern,
      soft_hard: values.soft_hard,
      heavy_light: values.heavy_light,
      user_agent: navigator.userAgent,
      uid: makeUid(), // 保険
      key,            // ★決定的key
    };

    // ローカル保存（バックアップ＆戻る復元）
    setRecords((prev) => [...prev, row]);

    // 送信済み key に登録（以後は再送しない）
    setSentKeys((prev) => new Set(prev).add(key));

    // UIは即前進
    if (index + 1 < images.length) {
      setIndex((i) => i + 1);
      resetValuesForNext();
    } else {
      setIndex(images.length);
      alert("すべての画像の評価が完了しました。スプレッドシートをご確認ください。");
    }

    // キューに積んで非同期送信
    const q = loadQueue();
    q.push(row);
    saveQueue(q);
    flushQueue();
  };

  // 戻る（Sheets側の取消はしない）
  const handleBack = () => {
    if (index === 0) return;

    if (index === images.length) {
      const last = records[records.length - 1];
      restoreValuesFromRecord(last);
      setRecords((prev) => prev.slice(0, -1));
      setIndex(images.length - 1);
      return;
    }

    const last = records[records.length - 1];
    restoreValuesFromRecord(last);
    setRecords((prev) => prev.slice(0, -1));
    setIndex((i) => Math.max(0, i - 1));
  };

  const handleResetAll = () => {
    setValues(initialValues);
    setGender("na");
    setAgeBucket("");
    setIndex(0);
    setRecords([]);
    setSentKeys(new Set()); // 送信済みキーも初期化（再計測用）
  };

  const allDone = images.length > 0 && index >= images.length;
  const canSubmitDemographics = ageBucket !== "";

  return (
    <div className="page">
      <header className="topbar">
        <h1 className="title">感性評価</h1>
        <p className="subtitle">
          {groupId ? `グループ: ${groupId} ／ 画像 ${Math.min(index + 1, images.length)} / ${images.length}` : "最初に評価グループを選んでください"}
        </p>
      </header>

      {!groupId && (
        <section className="card">
          <Segmented
            label="評価グループ"
            options={[1,2,3,4,5].map(n => ({ label: String(n), value: n }))}
            value={null}
            onChange={(g) => {
              setGroupId(g);
              const p = new URLSearchParams(location.search);
              p.set("group", String(g));
              history.replaceState(null, "", `${location.pathname}?${p.toString()}`);
              setIndex(0); setRecords([]); setValues(initialValues);
            }}
          />
        </section>
      )}

      {groupId && (
        <>
          <section className="card">
            <div className="card-head">
              <strong>タンブラー画像</strong>
              <button type="button" className="btn-ghost" onClick={() => setGroupId(null)} title="グループを選び直す">グループ変更</button>
            </div>
            <div className="img-wrap">
              {currentImage ? (
                <img src={currentImage} alt="タンブラー画像" className="stimulus" />
              ) : (
                <div style={{ padding: 16, color: "#666", fontSize: 14 }}>
                  {allDone ? "評価は完了しています。スプレッドシートをご確認ください。" : `画像が見つかりません（グループ${groupId}の画像配列を確認してください）`}
                </div>
              )}
            </div>
          </section>

          {index === 0 && (
            <section className="card">
              <Segmented label="性別" options={genderOptions} value={gender} onChange={setGender} />
              <Segmented label="年齢" options={ageOptions} value={ageBucket} onChange={setAgeBucket} />
            </section>
          )}

          <section className="card">
            <div className="scale-head global">
              <div className="head-grid">
                <span className="head-left">非常にそう思う</span>
                <span className="head-right">非常にそう思う</span>
              </div>
            </div>
            {pairs.map((p) => (
              <ScaleRow key={p.key} pair={p} value={values[p.key]} onChange={(v) => setVal(p.key, v)} />
            ))}
          </section>

          <div className="submit-bar">
            {!allDone ? (
              <>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleNext}
                  disabled={clickLocked || (index === 0 && !canSubmitDemographics) || !currentImage}
                  style={{ opacity: (clickLocked || (index === 0 && !canSubmitDemographics) || !currentImage) ? 0.5 : 1 }}
                >
                  {index + 1 < images.length ? "次へ" : "完了"}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleBack}
                  disabled={index === 0}
                  style={{ opacity: index === 0 ? 0.5 : 1 }}
                >
                  戻る
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => downloadCSV(records)}
                  disabled={records.length === 0}
                  style={{ opacity: records.length === 0 ? 0.5 : 1 }}
                >
                  （予備）自分の端末分CSVをダウンロード
                </button>
                <button type="button" className="btn-secondary" onClick={handleResetAll}>
                  最初からやり直す
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
