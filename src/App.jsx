import { useEffect, useMemo, useState } from "react";

/** ===== 画像セット =====
 * public/groups/g1..g5/ に PNG を置いてください
 */
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

/** 5段階（1〜5）の評価行。見た目は丸ボタン、数値は内部で記録（画面には出さない） */
function ScaleRow({ pair, value, onChange }) {
  const nums = [1, 2, 3, 4, 5];
  return (
    <div className="row row--grid">
      {/* 1段目：左右ラベル（端ぞろえ） */}
      <span className="label-left">{pair.left}</span>
      <span className="label-right">{pair.right}</span>

      {/* 2段目：○（数字は表示しない） */}
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
            >
              {/* 数字は表示しない（内部のみ記録） */}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** 横並びボタン汎用（性別・年齢・グループ選択に使用） */
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

export default function App() {
  // URLに ?group=1..5 / ?pid=... があれば初期選択
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
    }
    const pid = params.get("pid");
    if (pid) setParticipantId(String(pid));
  }, []);

  // 感性語対（文言更新）
  const pairs = useMemo(
    () => [
      { key: "modest_luxury", left: "控えめ", right: "豪華な" },
      { key: "colorful_monochrome", left: "カラフル", right: "モノクロ" },
      { key: "feminine_masculine", left: "女性らしい", right: "男性らしい" }, // ← 変更
      { key: "complex_simple", left: "複雑な", right: "シンプルな" },
      { key: "classic_modern", left: "古典的な", right: "現代的な" },         // ← 変更
      { key: "soft_hard", left: "柔らかい", right: "硬い" },
      { key: "heavy_light", left: "重い", right: "軽い" },
    ],
    []
  );

  // 評価の初期値：未選択（null）※3をデフォルト選択しない
  const initialValues = useMemo(
    () =>
      pairs.reduce((acc, p) => {
        acc[p.key] = null;
        return acc;
      }, {}),
    [pairs]
  );

  const [values, setValues] = useState(initialValues);

  // 性別・年齢（1ページ目のみ編集表示）
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
  const images = useMemo(() => {
    if (!groupId) return [];
    return GROUP_IMAGES[groupId] ?? [];
  }, [groupId]);

  const [index, setIndex] = useState(0);
  const [records, setRecords] = useState([]); // 送信済みレコード
  const currentImage = images[index] || null;

  const setVal = (key, v) => setValues((prev) => ({ ...prev, [key]: v }));

  const resetValuesForNext = () => {
    setValues(initialValues);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

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
    if (rec.gender) setGender(rec.gender);
    if (rec.age_bucket) setAgeBucket(rec.age_bucket);
  };

  // 5段階の全項目が選ばれているか（未選択が無いか）
  const allValuesSelected = useMemo(
    () => pairs.every((p) => values[p.key] !== null && values[p.key] !== undefined),
    [pairs, values]
  );

  // === 送信先（Apps Script） ===
  const ENDPOINT =
    import.meta.env.VITE_SHEETS_ENDPOINT ||
    "https://script.google.com/macros/s/AKfycbwiHh-U_jsyKmUsewEzAiHTkAI4YWcCcfVXSMsX0IQrZtFF6LD1uaxLxBpdo93LPMk/exec";

  // 次へ：現在の画像の回答を保存して送信→前進
  const [isSubmitting, setIsSubmitting] = useState(false);

  const postOne = async (row) => {
    try {
      await fetch(ENDPOINT, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(row),
      });
    } catch (e) {
      console.warn("submit failed (ignored):", e);
    }
  };

  const handleNext = async () => {
    if (!currentImage || !groupId) return;
    if (index === 0 && ageBucket === "") return; // 初回は年齢必須
    if (!allValuesSelected) return; // 全項目を選ばないと進めない

    const nowIso = new Date().toISOString();
    const trialNo = index + 1;

    const row = {
      timestamp: nowIso,
      participant_id: participantId,
      group_id: groupId,
      trial_no: trialNo,
      image: currentImage,
      gender,
      age_bucket: ageBucket || null,
      modest_luxury: values.modest_luxury, // 1..5（画面非表示・内部記録）
      colorful_monochrome: values.colorful_monochrome,
      feminine_masculine: values.feminine_masculine,
      complex_simple: values.complex_simple,
      classic_modern: values.classic_modern,
      soft_hard: values.soft_hard,
      heavy_light: values.heavy_light,
      user_agent: navigator.userAgent,
      key: `${nowIso}__${participantId}__g${groupId}__t${trialNo}`,
    };

    setIsSubmitting(true);
    await postOne(row);
    setIsSubmitting(false);

    setRecords((prev) => [...prev, row]);

    if (index + 1 < images.length) {
      setIndex((i) => i + 1);
      resetValuesForNext();
    } else {
      // 完了：サンクスページへ移行
      setIndex(images.length);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // 戻る：1つ前へ
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

  // すべてリセット（最初に戻る）
  const handleResetAll = () => {
    setValues(initialValues);
    setGender("na");
    setAgeBucket("");
    setIndex(0);
    setRecords([]);
    if (!lockedByQuery) setGroupId(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ウィンドウを閉じる（ブラウザ仕様で必ず閉じられるとは限らない）
  const handleClose = () => {
    window.close();
    setTimeout(() => {
      try {
        if (!document.hidden) {
          location.href = "about:blank";
        }
      } catch {}
    }, 200);
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

      {/* === 1) グループ選択 === */}
      {!groupId && (
        <section className="card">
          <Segmented
            label="評価グループ"
            options={[
              { label: "1", value: 1 },
              { label: "2", value: 2 },
              { label: "3", value: 3 },
              { label: "4", value: 4 },
              { label: "5", value: 5 },
            ]}
            value={null}
            onChange={(g) => {
              setGroupId(g);
              const p = new URLSearchParams(location.search);
              p.set("group", String(g));
              history.replaceState(null, "", `${location.pathname}?${p.toString()}`);
              setIndex(0);
              setRecords([]);
              setValues(initialValues);
            }}
          />
        </section>
      )}

      {/* === 2) 本編 or サンクスページ === */}
      {groupId && !allDone && (
        <>
          {/* 画像 */}
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

          {/* 性別・年齢：最初のページだけ表示 */}
          {index === 0 && (
            <section className="card">
              <Segmented label="性別" options={genderOptions} value={gender} onChange={setGender} />
              <Segmented label="年齢" options={ageOptions} value={ageBucket} onChange={setAgeBucket} />
            </section>
          )}

          {/* ガイド：1〜5すべてに表示（1/5=非常にそう思う、2/4=そう思う、3=どちらでもない） */}
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

            {/* 感性評価（5段階） */}
            {pairs.map((p) => (
              <ScaleRow key={p.key} pair={p} value={values[p.key]} onChange={(v) => setVal(p.key, v)} />
            ))}
          </section>

          {/* フッターバー（左=戻る / 右=次へ） */}
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

      {/* === 3) サンクスページ（完了後） === */}
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
        </section>
      )}
    </div>
  );
}
