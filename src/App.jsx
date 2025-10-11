import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, useSearchParams } from "react-router-dom";
import "./index.css";

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/results" element={<ResultsPage />} />
        <Route path="/image" element={<ImagePage />} />
      </Routes>
    </Router>
  );
}

// ------------------------
// ホーム画面
// ------------------------
function Home() {
  return (
    <div className="page home">
      <h1>感性評価</h1>
      <p>「みんなの結果を見る」ボタンから分布グラフを確認できます。</p>
      <a className="button" href="/results?g=1">みんなの結果を見る</a>
    </div>
  );
}

// ------------------------
// グループ一覧ページ
// ------------------------
function ResultsPage() {
  const [searchParams] = useSearchParams();
  const g = Number(searchParams.get("g") || "1");
  const [list, setList] = useState(null);

  useEffect(() => {
    const run = async () => {
      try {
        const url = new URL(`${API_BASE}/summary`, location.origin);
        url.searchParams.set("mode", "list");
        url.searchParams.set("g", String(g));
        const r = await fetch(url.toString(), { method: "GET" });
        const json = await r.json();
        setList(json?.images || []);
      } catch (e) {
        console.error(e);
        setList([]);
      }
    };
    if (g >= 1 && g <= 5) run();
  }, [g]);

  return (
    <div className="page results">
      <h1>グループ {g} の結果</h1>
      <div className="grid">
        {(list || []).map((rec, i) => {
          const id = rec.image_id ?? null;
          const path = rec.image ?? null;
          if (id == null) return null;

          const href = `/image?g=${g}&image_id=${encodeURIComponent(id)}`;
          const imgSrc = path || "";

          const rememberPath = () => {
            try {
              const map = JSON.parse(sessionStorage.getItem("imgMap") || "{}");
              map[String(id)] = imgSrc;
              sessionStorage.setItem("imgMap", JSON.stringify(map));
            } catch {}
          };

          return (
            <a className="card-thumb" href={href} key={id} onClick={rememberPath}>
              <div className="thumb">
                {imgSrc ? (
                  <img loading="lazy" src={imgSrc} alt="" />
                ) : (
                  <div className="ph">NO PREVIEW</div>
                )}
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}

// ------------------------
// 棒グラフページ
// ------------------------
function ImagePage() {
  const [searchParams] = useSearchParams();
  const g = Number(searchParams.get("g") || "1");
  const image_id = searchParams.get("image_id");
  const [meta, setMeta] = useState({ path: null });
  const [dist, setDist] = useState(null);

  useEffect(() => {
    const run = async () => {
      try {
        const url = new URL(`${API_BASE}/summary`, location.origin);
        url.searchParams.set("mode", "image");
        url.searchParams.set("g", String(g));
        if (!image_id) throw new Error("image_id is required");
        url.searchParams.set("image_id", String(image_id));

        const r = await fetch(url.toString(), { method: "GET" });
        const json = await r.json();

        setDist(json || null);

        let p = json?.image || json?.image_path || null;
        if (!p) {
          try {
            const map = JSON.parse(sessionStorage.getItem("imgMap") || "{}");
            p = map[String(image_id)] || null;
          } catch {}
        }
        setMeta({ path: p });
      } catch (e) {
        console.error(e);
        setDist(null);
        setMeta({ path: null });
      }
    };
    if (g >= 1 && g <= 5 && image_id) run();
  }, [g, image_id]);

  return (
    <div className="page image">
      <h1>分布グラフ</h1>
      <p className="subtitle">{g ? `グループ ${g}` : ""}</p>

      <div className="img-wrap">
        {meta.path ? (
          <img src={meta.path} alt="" className="main-img" />
        ) : (
          <div className="ph">画像なし</div>
        )}
      </div>

      {!dist ? (
        <p>読み込み中...</p>
      ) : (
        <BarChart dist={dist} />
      )}
    </div>
  );
}

// ------------------------
// 棒グラフ描画コンポーネント
// ------------------------
function BarChart({ dist }) {
  const values = dist?.values || dist?.data || [];
  if (!values.length) return <p>データがありません</p>;

  const total = values.reduce((s, v) => s + (v?.n || 0), 0);
  const maxN = Math.max(...values.map(v => v.n || 0), 1);

  return (
    <div className="barchart">
      {values.map((v, i) => (
        <div className="bar" key={i}>
          <div
            className="bar-inner"
            style={{ height: `${(v.n / maxN) * 100}%` }}
            title={`${v.n} 件`}
          />
          <span className="bar-label">{v.label || i + 1}</span>
        </div>
      ))}
      <p className="total">合計 {total} 件</p>
    </div>
  );
}

export default App;
