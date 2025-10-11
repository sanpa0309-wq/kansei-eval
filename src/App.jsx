// /src/App.jsx
import { useEffect, useMemo, useRef, useState } from "react";

/** ==== 画像メタ（id / path / aspect）====
 * aspect: "2x3" (266x400等の縦長) | "1x1" (400x400等)
 * 画像ファイルは public/ 以下に置く
 */
const GROUP_IMAGES = {
  1: [
    { id: 101, path: "/groups/g1/Consciousness-1.png", aspect: "2x3" },
    { id: 102, path: "/groups/g1/Conversations-3.png", aspect: "2x3" },
    { id: 103, path: "/groups/g1/Identity-2.png", aspect: "2x3" },
    { id: 104, path: "/groups/g1/Integrity-1.png", aspect: "2x3" },
    { id: 105, path: "/groups/g1/Materiality-3.png", aspect: "2x3" },
    { id: 106, path: "/groups/g1/Relationship-2.png", aspect: "2x3" },
  ],
  2: [
    { id: 201, path: "/groups/g2/Consciousness-2.png", aspect: "2x3" },
    { id: 202, path: "/groups/g2/Evolvability-1.png", aspect: "2x3" },
    { id: 203, path: "/groups/g2/Identity-3.png", aspect: "2x3" },
    { id: 204, path: "/groups/g2/Integrity-2.png", aspect: "2x3" },
    { id: 205, path: "/groups/g2/Narratives-1.png", aspect: "2x3" },
    { id: 206, path: "/groups/g2/Relationship-3.png", aspect: "2x3" },
  ],
  3: [
    { id: 301, path: "/groups/g3/Consciousness-3.png", aspect: "2x3" },
    { id: 302, path: "/groups/g3/Evolvability-2.png", aspect: "2x3" },
    { id: 303, path: "/groups/g3/Imagination-1.png", aspect: "2x3" },
    { id: 304, path: "/groups/g3/Integrity-3.png", aspect: "2x3" },
    { id: 305, path: "/groups/g3/Narratives-2.png", aspect: "2x3" },
    { id: 306, path: "/groups/g3/比較用タンブラー画像1.png", aspect: "1x1" },
  ],
  4: [
    { id: 401, path: "/groups/g4/Conversations-1.png", aspect: "2x3" },
    { id: 402, path: "/groups/g4/Evolvability-3.png", aspect: "2x3" },
    { id: 403, path: "/groups/g4/Imagination-2.png", aspect: "2x3" },
    { id: 404, path: "/groups/g4/Materiality-1.png", aspect: "2x3" },
    { id: 405, path: "/groups/g4/Narratives-3.png", aspect: "2x3" },
    { id: 406, path: "/groups/g4/比較用タンブラー画像2.png", aspect: "1x1" },
  ],
  5: [
    { id: 501, path: "/groups/g5/Conversations-2.png", aspect: "2x3" },
    { id: 502, path: "/groups/g5/Identity-1.png", aspect: "2x3" },
    { id: 503, path: "/groups/g5/Imagination-3.png", aspect: "2x3" },
    { id: 504, path: "/groups/g5/Materiality-2.png", aspect: "2x3" },
    { id: 505, path: "/groups/g5/Relationship-1.png", aspect: "2x3" },
    { id: 506, path: "/groups/g5/比較用タンブラー画像3.png", aspect: "1x1" },
  ],
};

/** 5段階（1〜5） */
function ScaleRow({ pair, value, onChange }) {
  const nums = [1, 2, 3, 4, 5];
  return (
    <div className="row row--grid">
      <span className="label-left">{pair.left}</span>
      <span className="label-right">{pair.right}</span>
      <div className="btn-scale" aria-label={`${pair.left} から ${pair.right} の5段階評価`}>
        {nums.map((n) => (
          <button
            key={n}
            type="button"
            aria-pressed={value === n}
            aria-label={`${n}`}
            onClick={() => onChange(n)}
            className={`pill ${value === n ? "pill--active" : ""}`}
          />
        ))}
      </div>
    </div>
  );
}

/** セグメント（性別・年齢・グループ） */
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

/** 乱数（安定シャッフル用・シード付き） */
function mulberry32(seed) {
  return function() {
    let t = (seed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashStringToSeed(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function shuffleStable(arr, seedStr) {
  const rng = mulberry32(hashStringToSeed(seedStr));
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Cookie helpers */
function getCookie(name) {
  const m = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1') + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null;
}
function setCookie(name, value, days = 365) {
  const d = new Date();
  d.setTime(d.getTime() + days * 864e5);
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; path=/; expires=${d.toUTCString()}`;
}

/** API base */
const API_BASE = import.meta.env.VITE_API_BASE || "/api";

export default function App() {
  // participant_id（セッション内で固定／「最初から」で更新）
  const [participantId, setParticipantId] = useState(null);
  useEffect(() => {
    const cur = sessionStorage.getItem("currentPid");
    if (cur) {
      setParticipantId(cur);
    } else {
      const pid = crypto.randomUUID();
      sessionStorage.setItem("currentPid", pid);
      setParticipantId(pid);
    }
  }, []);

  // グループ自動割当（ほぼ均等）。URL ?group= があれば優先
  const [groupId, setGroupId] = useState(null);
  const [lockedByQuery, setLockedByQuery] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const qg = params.get("group");
    const g = qg ? parseInt(qg, 10) : null;
    if (g && g >= 1 && g <= 5) {
      setGroupId(g);
      setLockedByQuery(true);
      return;
    }
    const last = parseInt(getCookie("lastGroup") || "0", 10);
    const next = ((last % 5) + 1);
    setGroupId(next);
    setCookie("lastGroup", String(next));
  }, []);

  // 感性語対
  const pairs = useMemo(() => ([
    { key: "modest_luxury", left: "控えめ", right: "豪華な" },
    { key: "colorful_monochrome", left: "カラフル", right: "モノクロ" },
    { key: "feminine_masculine", left: "女性らしい", right: "男性らしい" },
    { key: "complex_simple", left: "複雑な", right: "シンプルな" },
    { key: "classic_modern", left: "古典的な", right: "現代的な" },
    { key: "soft_hard", left: "柔らかい", right: "硬い" },
    { key: "heavy_light", left: "重い", right: "軽い" },
  ]), []);

  // 評価初期値
  const initialValues = useMemo(() => pairs.reduce((acc, p) => (acc[p.key] = null, acc), {}), [pairs]);
  const [values, setValues] = useState(initialValues);
  const setVal = (key, v) => setValues(prev => ({ ...prev, [key]: v }));

  // 性別・年齢（数値化）
  const genderOptions = [
    { label: "男性", value: 1 },
    { label: "女性", value: 2 },
    { label: "無回答", value: 0 },
  ];
  const ageOptions = [
    { label: "0〜9歳", value: 1 },
    { label: "10〜19歳", value: 2 },
    { label: "20〜29歳", value: 3 },
    { label: "30〜39歳", value: 4 },
    { label: "40〜49歳", value: 5 },
    { label: "50〜59歳", value: 6 },
    { label: "60〜69歳", value: 7 },
    { label: "70歳〜", value: 8 },
  ];
  const [gender, setGender] = useState(0);
  const [ageBucket, setAgeBucket] = useState("");

  // 画像配列（グループ別）→ 参加者ごとに安定シャッフル
  const rawImages = useMemo(() => (groupId ? (GROUP_IMAGES[groupId] || []) : []), [groupId]);
  const images = useMemo(() => {
    if (!participantId) return [];
    return shuffleStable(rawImages, `${participantId}::g${groupId || 0}`);
  }, [participantId, rawImages, groupId]);

  const [index, setIndex] = useState(0);
  const [records, setRecords] = useState([]);
  const current = images[index] || null;

  // 直前レコードから復元（戻る用）
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
    if (typeof rec.gender === "number") setGender(rec.gender);
    if (rec.age_bucket !== undefined) setAgeBucket(rec.age_bucket);
  };

  const allValuesSelected = useMemo(
    () => pairs.every((p) => values[p.key] !== null && values[p.key] !== undefined),
    [pairs, values]
  );

  // 送信
  const [isSubmitting, setIsSubmitting] = useState(false);
  const postOne = async (payload) => {
    const res = await fetch(`${API_BASE}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    // Apps Script は常に200/JSONを返す設計（エラー時も {status:error}）
    try { await res.json(); } catch {}
  };

  const handleNext = async () => {
    if (!current || !groupId || !participantId) return;
    if (index === 0 && ageBucket === "") return; // 初回は年齢必須
    if (!allValuesSelected) return;

    const nowIso = new Date().toISOString();
    const trialNo = index + 1;
    const key = `${participantId}__g${groupId}__imgid:${current.id}`;

    const row = {
      timestamp: nowIso,
      participant_id: participantId,
      group_id: groupId,
      image_id: current.id,           // 数値ID
      image: "",                      // 互換不要なら送らなくてもOK（Apps Scriptは両対応）
      gender: Number(gender ?? 0),    // 0,1,2
      age_bucket: ageBucket === "" ? "" : Number(ageBucket), // 1..8, ""(未)
      modest_luxury: values.modest_luxury,
      colorful_monochrome: values.colorful_monochrome,
      feminine_masculine: values.feminine_masculine,
      complex_simple: values.complex_simple,
      classic_modern: values.classic_modern,
      soft_hard: values.soft_hard,
      heavy_light: values.heavy_light,
      trial_no: trialNo,
      key,                            // upsertキー：pid+group+image_id
    };

    setIsSubmitting(true);
    await postOne(row);
    setIsSubmitting(false);

    setRecords((prev) => [...prev, row]);

    if (index + 1 < images.length) {
      setIndex((i) => i + 1);
      setValues(initialValues);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setIndex(images.length); // 完了
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

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

  const handleResetAll = () => {
    // 新しい participant_id を発行
    const pid = crypto.randomUUID();
    sessionStorage.setItem("currentPid", pid);
    setParticipantId(pid);

    // 状態初期化
    setValues(initialValues);
    setGender(0);
    setAgeBucket("");
    setIndex(0);
    setRecords([]);

    if (!lockedByQuery) {
      // 次のグループに進める（ほぼ均等）
      const last = parseInt(getCookie("lastGroup") || "0", 10);
      const next = ((last % 5) + 1);
      setCookie("lastGroup", String(next));
      setGroupId(next);
      const p = new URLSearchParams(location.search);
      p.delete("group");
      history.replaceState(null, "", `${location.pathname}?${p.toString()}`);
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleClose = () => {
    window.close();
    setTimeout(() => {
      try { if (!document.hidden) location.href = "about:blank"; } catch {}
    }, 200);
  };

  const allDone = images.length > 0 && index >= images.length;
  const canSubmit = current && allValuesSelected && (index !== 0 || ageBucket !== "");

  // ===== 結果ダイアログ（一覧 → サムネクリックで分布フェッチ） =====
  const [showResults, setShowResults] = useState(false);
  const [list, setList] = useState(null);     // { images:[{image_id,image,n}], total }
  const [detail, setDetail] = useState(null); // summaryByImage の結果
  const [myAnswerForImage, setMyAnswerForImage] = useState(null); // その画像の自分の7項目

  const openResults = async () => {
    if (!groupId) return;
    setShowResults(true);
    setDetail(null);
    const res = await fetch(`${API_BASE}/summary?mode=list&g=${groupId}`);
    const data = await res.json();
    setList(data);
  };
  const openImageDetail = async (imgId) => {
    if (!groupId) return;
    setDetail(null);
    // 自分の回答（最後の records から拾う）
    const mine = records.find(r => r.image_id === imgId);
    setMyAnswerForImage(mine || null);

    const res = await fetch(`${API_BASE}/summary?mode=image&g=${groupId}&image_id=${imgId}`);
    const data = await res.json();
    setDetail(data);
  };

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

      {/* グループ手動選択（必要なら） */}
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
              setIndex(0); setRecords([]); setValues(initialValues);
            }}
          />
        </section>
      )}

      {/* 本編 or サンクスページ */}
      {groupId && !allDone && (
        <>
          <section className="card">
            <div className="card-head">
              <strong>タンブラー画像</strong>
              {!lockedByQuery && (
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setGroupId(null)}
                  title="グループを選び直す"
                >
                  グループ変更
                </button>
              )}
            </div>
            <div className={`img-wrap ${current?.aspect === "1x1" ? "sq" : "v23"}`}>
              {current ? (
                <img src={current.path} alt="タンブラー画像" className="stimulus" />
              ) : (
                <div style={{ padding: 16, color: "#666", fontSize: 14 }}>
                  画像が見つかりません（グループ{groupId}の画像配列を確認してください）
                </div>
              )}
            </div>
          </section>

          {/* 初回のみ 性別・年齢 */}
          {index === 0 && (
            <section className="card">
              <Segmented label="性別" options={genderOptions} value={gender} onChange={setGender} />
              <Segmented label="年齢" options={ageOptions} value={ageBucket} onChange={setAgeBucket} />
            </section>
          )}

          {/* ガイド */}
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

          {/* フッターバー */}
          <div className="submit-bar">
            <button
              type="button"
              className="btn-secondary"
              onClick={handleBack}
              disabled={index === 0}
              style={{ opacity: index === 0 ? 0.5 : 1 }}
            >
              戻る
            </button>

            <button
              type="button"
              className="btn-primary"
              onClick={handleNext}
              disabled={!canSubmit || isSubmitting}
              style={{ opacity: !canSubmit || isSubmitting ? 0.5 : 1 }}
            >
              {index + 1 < images.length ? (isSubmitting ? "送信中…" : "次へ") : (isSubmitting ? "送信中…" : "完了")}
            </button>
          </div>
        </>
      )}

      {/* 完了後 */}
      {groupId && allDone && (
        <section className="card" style={{ textAlign: "center", padding: "32px 16px" }}>
          <h2 style={{ marginTop: 0, marginBottom: 8 }}>ご回答ありがとうございました。</h2>
          <p style={{ color: "#666", marginTop: 0, marginBottom: 24 }}>
            ご協力に感謝いたします。
          </p>

          <div className="submit-bar" style={{ marginTop: 8 }}>
            <button type="button" className="btn-secondary" onClick={handleResetAll}>
              最初からやり直す
            </button>
            <button type="button" className="btn-primary" onClick={handleClose}>
              アンケートを閉じる
            </button>
          </div>

          <div style={{ marginTop: 16 }}>
            <button type="button" className="btn-primary" onClick={openResults}>
              みんなの結果を見る
            </button>
          </div>
        </section>
      )}

      {/* 結果ダイアログ */}
      {showResults && (
        <div className="modal">
          <div className="modal-inner">
            <div className="modal-head">
              <strong>グループ{groupId} の写真一覧</strong>
              <button className="btn-ghost" onClick={() => setShowResults(false)}>閉じる</button>
            </div>
            {!list ? (
              <div style={{padding:16}}>読み込み中…</div>
            ) : (
              <div>
                <div className="grid">
                  {list.images.map((it) => (
                    <button
                      key={(it.image_id ?? it.image) + ""}
                      className="card thumb-card"
                      onClick={() => openImageDetail(it.image_id)}
                    >
                      <div className={`thumb ${findAspectById(images, it.image_id) === "1x1" ? "sq" : "v23"}`}>
                        <img src={findPathById(images, it.image_id)} alt="" />
                      </div>
                      <div className="iname">回答数: {it.n}</div>
                    </button>
                  ))}
                </div>

                {/* 詳細（画像をタップしたら表示） */}
                {detail && (
                  <div className="detail">
                    <h3>分布（クリックした画像）</h3>
                    <div className="rows">
                      {pairs.map((p) => {
                        const counts = detail.counts?.[p.key] || { '1':0,'2':0,'3':0,'4':0,'5':0 };
                        const bins = [1,2,3,4,5].map(v => Number(counts[String(v)] || 0));
                        const maxN = Math.max(1, ...bins);
                        const my = myAnswerForImage ? Number(myAnswerForImage[p.key]) : null;

                        return (
                          <div className="row dist-row" key={p.key}>
                            <div className="label-left">{p.left}</div>
                            <div className="bars">
                              {bins.map((n, i) => {
                                const pct = (n / maxN) * 100;
                                const isMine = (my === (i+1));
                                return (
                                  <div
                                    key={i}
                                    className={`bar ${isMine ? "mine" : ""}`}
                                    style={{ height: `${Math.round(pct)}%` }}
                                    title={`${i+1}: ${n}`}
                                  />
                                );
                              })}
                              <div className="ticks"><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span></div>
                            </div>
                            <div className="label-right">{p.right}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function findPathById(images, id) {
  const t = Object.values(GROUP_IMAGES).flat().find(x => x.id === id);
  return t ? t.path : "";
}
function findAspectById(images, id) {
  const t = Object.values(GROUP_IMAGES).flat().find(x => x.id === id);
  return t ? t.aspect : "2x3";
}
