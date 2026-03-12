import { useState } from "react";
import { auth, db } from "./firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { collection, addDoc, getDocs, updateDoc, doc, serverTimestamp, query, orderBy } from "firebase/firestore";

const ADMIN_EMAIL = "prefeitura@civico.com";

function Btn({ onClick, children, color = "blue", disabled = false }) {
  const [pressed, setPressed] = useState(false);
  const bg = {
    blue:  "linear-gradient(135deg,#0D1F4E,#1B4FD8)",
    green: "linear-gradient(135deg,#0A7C4E,#10B981)",
    gray:  "#94A3B8",
  };
  return (
    <button
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => { setPressed(false); if (!disabled) onClick(); }}
      onPointerLeave={() => setPressed(false)}
      disabled={disabled}
      style={{
        width: "100%", padding: "16px", borderRadius: 12,
        background: disabled ? bg.gray : bg[color],
        color: "white", fontSize: 16, fontWeight: 700,
        border: "none", cursor: disabled ? "not-allowed" : "pointer",
        marginBottom: 12,
        transform: pressed ? "scale(0.97)" : "scale(1)",
        boxShadow: pressed ? "0 2px 8px rgba(0,0,0,0.15)" : "0 4px 16px rgba(0,0,0,0.18)",
        transition: "transform 0.1s, box-shadow 0.1s",
        WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation",
      }}
    >
      {children}
    </button>
  );
}

function Card({ onClick, children, highlight = false }) {
  const [pressed, setPressed] = useState(false);
  return (
    <div
      onPointerDown={() => onClick && setPressed(true)}
      onPointerUp={() => { setPressed(false); if (onClick) onClick(); }}
      onPointerLeave={() => setPressed(false)}
      style={{
        background: pressed ? "#EEF3FE" : "white",
        borderRadius: 20, padding: 24,
        boxShadow: pressed ? "0 2px 8px rgba(0,0,0,0.08)" : "0 4px 20px rgba(0,0,0,0.06)",
        cursor: onClick ? "pointer" : "default",
        border: highlight ? "2px solid #1B4FD8" : "2px solid #F1F5F9",
        transform: pressed ? "scale(0.97)" : "scale(1)",
        transition: "transform 0.1s, box-shadow 0.1s, background 0.1s",
        WebkitTapHighlightColor: "transparent",
        userSelect: "none", touchAction: "manipulation",
      }}
    >
      {children}
    </div>
  );
}

function StatusBtn({ onClick, children, color }) {
  const [pressed, setPressed] = useState(false);
  const styles = {
    amber: { background: "#FEF3C7", color: "#B45309" },
    green: { background: "#DCFCE7", color: "#0A7C4E" },
    red:   { background: "#FEE2E2", color: "#B91C1C" },
  };
  return (
    <button
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => { setPressed(false); onClick(); }}
      onPointerLeave={() => setPressed(false)}
      style={{
        ...styles[color], border: "none", borderRadius: 8,
        padding: "7px 12px", cursor: "pointer", fontSize: 13, fontWeight: 700,
        transform: pressed ? "scale(0.95)" : "scale(1)",
        transition: "transform 0.1s",
        WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation",
      }}
    >
      {children}
    </button>
  );
}

function Link({ onClick, children }) {
  return (
    <span
      onPointerUp={() => onClick()}
      style={{
        color: "#1B4FD8", fontWeight: 700, cursor: "pointer",
        padding: "8px 4px", display: "inline-block",
        WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation",
      }}
    >
      {children}
    </span>
  );
}

const inputStyle = {
  width: "100%", padding: "14px 16px", borderRadius: 12,
  border: "1.5px solid #E2E8F0", fontSize: 16,
  marginBottom: 12, boxSizing: "border-box", outline: "none",
  WebkitAppearance: "none", touchAction: "manipulation",
};

export default function App() {
  const [tela, setTela]             = useState("login");
  const [tipoLogin, setTipoLogin]   = useState("cidadao");
  const [email, setEmail]           = useState("");
  const [senha, setSenha]           = useState("");
  const [erro, setErro]             = useState("");
  const [usuario, setUsuario]       = useState(null);
  const [titulo, setTitulo]         = useState("");
  const [descricao, setDescricao]   = useState("");
  const [categoria, setCategoria]   = useState("");
  const [enviando, setEnviando]     = useState(false);
  const [sucesso, setSucesso]       = useState(false);
  const [chamados, setChamados]     = useState([]);
  const [carregando, setCarregando] = useState(false);

  async function entrar() {
    setErro("");
    try {
      const result = await signInWithEmailAndPassword(auth, email, senha);
      const isAdmin = result.user.email === ADMIN_EMAIL;
      if (tipoLogin === "admin" && !isAdmin)   { await signOut(auth); setErro("Acesso negado para este e-mail."); return; }
      if (tipoLogin === "cidadao" && isAdmin)  { await signOut(auth); setErro("Use o acesso Administração."); return; }
      setUsuario(result.user);
      setTela(isAdmin ? "painel" : "home");
    } catch (e) {
      setErro("E-mail ou senha incorretos.");
    }
  }

  async function cadastrar() {
    setErro("");
    if (!email || !senha) { setErro("Preencha e-mail e senha."); return; }
    if (senha.length < 6) { setErro("Senha precisa ter pelo menos 6 caracteres."); return; }
    try {
      const result = await createUserWithEmailAndPassword(auth, email, senha);
      setUsuario(result.user);
      setTela("home");
    } catch (e) {
      if (e.code === "auth/email-already-in-use") setErro("Este e-mail já está cadastrado.");
      else setErro("Erro ao cadastrar. Tente novamente.");
    }
  }

  async function sair() {
    await signOut(auth);
    setUsuario(null); setEmail(""); setSenha("");
    setTela("login");
  }

  async function enviarReporte() {
    if (!titulo || !descricao || !categoria) { alert("Preencha todos os campos!"); return; }
    setEnviando(true);
    try {
      await addDoc(collection(db, "chamados"), {
        titulo, descricao, categoria, status: "aberto",
        email: usuario.email, userId: usuario.uid, criadoEm: serverTimestamp()
      });
      setSucesso(true); setTitulo(""); setDescricao(""); setCategoria("");
    } catch (e) { alert("Erro ao enviar. Tente novamente."); }
    setEnviando(false);
  }

  async function carregarChamados() {
    setCarregando(true);
    try {
      const q = query(collection(db, "chamados"), orderBy("criadoEm", "desc"));
      const snap = await getDocs(q);
      setChamados(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
    setCarregando(false);
  }

  async function mudarStatus(id, novoStatus) {
    await updateDoc(doc(db, "chamados", id), { status: novoStatus });
    carregarChamados();
  }

  const statusCor   = { aberto: "#B91C1C", "em andamento": "#B45309", resolvido: "#0A7C4E" };
  const statusBg    = { aberto: "#FEE2E2", "em andamento": "#FEF3C7", resolvido: "#DCFCE7" };
  const statusLabel = { aberto: "🔴 Aberto", "em andamento": "🟡 Em andamento", resolvido: "🟢 Resolvido" };

  // ── PAINEL ───────────────────────────────────────────────────
  if (tela === "painel") return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", fontFamily: "Arial, sans-serif" }}>
      <div style={{ background: "linear-gradient(135deg,#0D1F4E,#1B4FD8)", padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 900, color: "white" }}>🏛️ Administração</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>Cívico — Gestão de Chamados</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onPointerUp={carregarChamados} style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", color: "white", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: 13, touchAction: "manipulation" }}>🔄</button>
          <button onPointerUp={sair} style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", color: "white", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: 13, touchAction: "manipulation" }}>Sair</button>
        </div>
      </div>
      <div style={{ padding: "20px 16px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 20 }}>
          {[
            { label: "Total",      valor: chamados.length, cor: "#1B4FD8" },
            { label: "Em Aberto",  valor: chamados.filter(c => c.status === "aberto").length, cor: "#B91C1C" },
            { label: "Resolvidos", valor: chamados.filter(c => c.status === "resolvido").length, cor: "#0A7C4E" },
          ].map((s, i) => (
            <div key={i} style={{ background: "white", borderRadius: 14, padding: 16, boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: s.cor }}>{s.valor}</div>
              <div style={{ fontSize: 13, color: "#64748B" }}>{s.label}</div>
            </div>
          ))}
        </div>
        <div style={{ background: "white", borderRadius: 16, boxShadow: "0 2px 10px rgba(0,0,0,0.05)", overflow: "hidden" }}>
          <div style={{ background: "#0D1F4E", padding: "14px 20px" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "white" }}>📋 Chamados Recebidos</div>
          </div>
          {carregando ? (
            <div style={{ padding: 40, textAlign: "center", color: "#94A3B8" }}>Carregando...</div>
          ) : chamados.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "#94A3B8" }}>
              Nenhum chamado ainda.<br /><br />
              <button onPointerUp={carregarChamados} style={{ background: "#1B4FD8", color: "white", border: "none", borderRadius: 8, padding: "10px 20px", cursor: "pointer", fontWeight: 700, touchAction: "manipulation" }}>Carregar chamados</button>
            </div>
          ) : chamados.map((c, i) => (
            <div key={c.id} style={{ padding: "16px 20px", borderBottom: "1px solid #F1F5F9", background: i % 2 === 0 ? "white" : "#FAFAFA" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                <span style={{ background: statusBg[c.status], color: statusCor[c.status], fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>{statusLabel[c.status]}</span>
                <span style={{ fontSize: 12, color: "#94A3B8" }}>{c.categoria}</span>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#0D1F4E", marginBottom: 4 }}>{c.titulo}</div>
              <div style={{ fontSize: 13, color: "#64748B", marginBottom: 4 }}>{c.descricao}</div>
              <div style={{ fontSize: 12, color: "#94A3B8", marginBottom: 10 }}>👤 {c.email}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {c.status !== "em andamento" && <StatusBtn onClick={() => mudarStatus(c.id, "em andamento")} color="amber">🟡 Em andamento</StatusBtn>}
                {c.status !== "resolvido"    && <StatusBtn onClick={() => mudarStatus(c.id, "resolvido")}    color="green">🟢 Resolvido</StatusBtn>}
                {c.status !== "aberto"       && <StatusBtn onClick={() => mudarStatus(c.id, "aberto")}       color="red">🔴 Reabrir</StatusBtn>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ── REPORTE ──────────────────────────────────────────────────
  if (tela === "reporte") return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", fontFamily: "Arial, sans-serif" }}>
      <div style={{ background: "linear-gradient(135deg,#0D1F4E,#1B4FD8)", padding: "20px 24px", display: "flex", alignItems: "center", gap: 14 }}>
        <button onPointerUp={() => { setTela("home"); setSucesso(false); }} style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", color: "white", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: 14, touchAction: "manipulation" }}>← Voltar</button>
        <div style={{ fontSize: 20, fontWeight: 900, color: "white" }}>📸 Reportar Problema</div>
      </div>
      <div style={{ padding: 24, maxWidth: 600, margin: "0 auto" }}>
        {sucesso ? (
          <div style={{ background: "white", borderRadius: 20, padding: 40, textAlign: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#0A7C4E", marginBottom: 8 }}>Reporte enviado!</div>
            <div style={{ fontSize: 15, color: "#64748B", marginBottom: 28 }}>Sua solicitação foi registrada.</div>
            <Btn onClick={() => setSucesso(false)}>Reportar outro</Btn>
          </div>
        ) : (
          <div style={{ background: "white", borderRadius: 20, padding: 24, boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 14, fontWeight: 700, color: "#0D1F4E", display: "block", marginBottom: 8 }}>Categoria</label>
              <select value={categoria} onChange={e => setCategoria(e.target.value)} style={{ ...inputStyle, marginBottom: 0 }}>
                <option value="">Selecione...</option>
                <option value="buraco">🕳️ Buraco na rua</option>
                <option value="iluminacao">💡 Iluminação pública</option>
                <option value="lixo">🗑️ Lixo acumulado</option>
                <option value="calcada">🚶 Calçada danificada</option>
                <option value="arvore">🌳 Árvore caída</option>
                <option value="esgoto">💧 Esgoto a céu aberto</option>
                <option value="outro">📌 Outro</option>
              </select>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 14, fontWeight: 700, color: "#0D1F4E", display: "block", marginBottom: 8 }}>Título</label>
              <input placeholder="Ex: Buraco na Rua das Flores" value={titulo} onChange={e => setTitulo(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 14, fontWeight: 700, color: "#0D1F4E", display: "block", marginBottom: 8 }}>Descrição</label>
              <textarea placeholder="Descreva o problema..." value={descricao} onChange={e => setDescricao(e.target.value)} rows={4} style={{ ...inputStyle, resize: "vertical" }} />
            </div>
            <Btn onClick={enviarReporte} disabled={enviando}>{enviando ? "Enviando..." : "📤 Enviar Reporte"}</Btn>
          </div>
        )}
      </div>
    </div>
  );

  // ── HOME ─────────────────────────────────────────────────────
  if (tela === "home") return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", fontFamily: "Arial, sans-serif" }}>
      <div style={{ background: "linear-gradient(135deg,#0D1F4E,#1B4FD8)", padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: "white" }}>🏙️ Cívico</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 13 }}>{usuario?.email}</span>
          <button onPointerUp={sair} style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", color: "white", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: 13, touchAction: "manipulation" }}>Sair</button>
        </div>
      </div>
      <div style={{ padding: 24, maxWidth: 800, margin: "0 auto" }}>
        <h2 style={{ color: "#0D1F4E", fontSize: 26, fontWeight: 900, marginBottom: 6 }}>Olá! 👋</h2>
        <p style={{ color: "#64748B", marginBottom: 28 }}>O que você quer fazer hoje?</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Card onClick={() => setTela("reporte")} highlight>
            <div style={{ fontSize: 44, marginBottom: 12 }}>📸</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#0D1F4E", marginBottom: 6 }}>Reportar Problema</div>
            <div style={{ fontSize: 13, color: "#64748B" }}>Registre um problema na sua cidade</div>
          </Card>
          <Card>
            <div style={{ fontSize: 44, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#0D1F4E", marginBottom: 6 }}>Meus Chamados</div>
            <div style={{ fontSize: 13, color: "#64748B" }}>Acompanhe seus reportes</div>
          </Card>
        </div>
      </div>
    </div>
  );

  // ── LOGIN / CADASTRO ─────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0D1F4E 0%,#1B4FD8 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Arial, sans-serif", padding: 16 }}>
      <div style={{ background: "white", borderRadius: 24, padding: "40px 32px", width: "100%", maxWidth: 400, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>

        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 44, fontWeight: 900, color: "#0D1F4E", letterSpacing: -1 }}>🏙️ Cívico</div>
        </div>

        {/* Abas */}
        <div style={{ display: "flex", background: "#F1F5F9", borderRadius: 12, padding: 4, marginBottom: 24 }}>
          {[["cidadao", "👤 Cidadão"], ["admin", "🏛️ Administração"]].map(([val, label]) => (
            <button
              key={val}
              onPointerUp={() => { setTipoLogin(val); setErro(""); setTela("login"); }}
              style={{
                flex: 1, padding: "10px 8px", borderRadius: 9, border: "none", cursor: "pointer",
                fontSize: val === "admin" ? 13 : 14, fontWeight: 700,
                background: tipoLogin === val ? "white" : "transparent",
                color: tipoLogin === val ? "#0D1F4E" : "#94A3B8",
                boxShadow: tipoLogin === val ? "0 2px 8px rgba(0,0,0,0.10)" : "none",
                transition: "all 0.2s",
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation",
              }}
            >{label}</button>
          ))}
        </div>

        {erro && (
          <div style={{ background: "#FEE2E2", color: "#B91C1C", fontSize: 14, marginBottom: 16, padding: "10px 14px", borderRadius: 10, textAlign: "center" }}>{erro}</div>
        )}

        <input placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} type="email" style={inputStyle} />
        <input placeholder="Senha" value={senha} onChange={e => setSenha(e.target.value)} type="password" style={{ ...inputStyle, marginBottom: 20 }} />

        {tela === "login" ? (
          <>
            <Btn onClick={entrar}>Entrar</Btn>
            {tipoLogin === "cidadao" && (
              <div style={{ textAlign: "center", fontSize: 14, color: "#94A3B8", marginTop: 4 }}>
                Não tem conta?{" "}
                <Link onClick={() => { setTela("cadastro"); setErro(""); }}>Cadastre-se</Link>
              </div>
            )}
          </>
        ) : (
          <>
            <Btn onClick={cadastrar} color="green">Criar conta</Btn>
            <div style={{ textAlign: "center", fontSize: 14, color: "#94A3B8", marginTop: 4 }}>
              Já tem conta?{" "}
              <Link onClick={() => { setTela("login"); setErro(""); }}>Entrar</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}