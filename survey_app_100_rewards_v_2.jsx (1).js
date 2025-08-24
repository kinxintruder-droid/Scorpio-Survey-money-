import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart as RBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Plus, Trash2, BarChart3, Copy, Check, Wallet, DollarSign } from "lucide-react";

// shadcn/ui components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

// -------------------- Types --------------------
/** @typedef {"text"|"mcq"|"rating"} QType */

/** @typedef {{ id: string; type: QType; prompt: string; required: boolean; options?: string[]; max?: number }} Question */
/** @typedef {{ title: string; description: string; questions: Question[] }} Survey */
/** @typedef {{ timestamp: number; answers: Record<string, string|number> }} Response */
/** @typedef {{ balance: number; payouts: { id: string; amount: number; timestamp: number }[] }} Wallet */

// -------------------- Utils --------------------
const uid = () => Math.random().toString(36).slice(2, 9);
const LS_KEY = "survey_app_v2_rewards";
const REWARD_PER_SUBMISSION = 100; // $100 per completed survey

function useLocalStorage(key, initial) {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {}
  }, [key, state]);
  return [state, setState];
}

// -------------------- Main App --------------------
export default function SurveyApp() {
  const [store, setStore] = useLocalStorage(LS_KEY, {
    survey: /** @type {Survey} */ ({
      title: "Customer Feedback",
      description: "Answer & earn real-looking (simulated) rewards.",
      questions: [
        { id: uid(), type: "rating", prompt: "Rate your overall experience", required: true, max: 5 },
        { id: uid(), type: "mcq", prompt: "What did you like most?", required: false, options: ["Design", "Performance", "Price", "Support"] },
        { id: uid(), type: "text", prompt: "Any suggestions?", required: false },
      ],
    }),
    responses: /** @type {Response[]} */ ([]),
    wallet: /** @type {Wallet} */ ({ balance: 0, payouts: [] }),
  });

  const { survey, responses, wallet } = store;
  const [tab, setTab] = useState("build");

  const saveSurvey = (nextSurvey) => setStore((s) => ({ ...s, survey: nextSurvey }));
  const addResponse = (resp) =>
    setStore((s) => ({
      ...s,
      responses: [...s.responses, resp],
      wallet: { ...s.wallet, balance: s.wallet.balance + REWARD_PER_SUBMISSION },
    }));
  const resetData = () =>
    setStore({
      survey: { title: "New Survey", description: "", questions: [] },
      responses: [],
      wallet: { balance: 0, payouts: [] },
    });

  const cashOut = () => {
    if (wallet.balance < 100) {
      alert("Minimum cash out is $100.");
      return;
    }
    const amount = Math.floor(wallet.balance / 100) * 100; // multiples of $100
    const payout = { id: uid(), amount, timestamp: Date.now() };
    setStore((s) => ({
      ...s,
      wallet: { balance: s.wallet.balance - amount, payouts: [payout, ...s.wallet.payouts] },
    }));
    alert(`Cash out requested: $${amount}. (Simulated)`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-900 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">📋 Survey App + Rewards</h1>
            <p className="text-sm text-slate-500">Earn <span className="font-semibold">${REWARD_PER_SUBMISSION}.00</span> per completed submission (demo wallet, no real payouts).</p>
          </div>
          <div className="flex items-center gap-2">
            <WalletBar wallet={wallet} onCashOut={cashOut} />
            <ExportImport survey={survey} setStore={setStore} />
            <Button variant="destructive" onClick={resetData} className="rounded-2xl">Reset</Button>
          </div>
        </header>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 rounded-2xl">
            <TabsTrigger value="build">Build</TabsTrigger>
            <TabsTrigger value="collect">Collect</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
          </TabsList>

          <TabsContent value="build" className="mt-4">
            <Builder survey={survey} onChange={saveSurvey} />
          </TabsContent>
          <TabsContent value="collect" className="mt-4">
            <Collector survey={survey} onSubmit={addResponse} />
          </TabsContent>
          <TabsContent value="results" className="mt-4">
            <Results survey={survey} responses={responses} wallet={wallet} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function WalletBar({ wallet, onCashOut }) {
  return (
    <div className="flex items-center gap-2">
      <Card className="rounded-2xl shadow-sm">
        <CardContent className="px-3 py-2 flex items-center gap-2 text-sm">
          <Wallet className="h-4 w-4" />
          <span className="text-slate-600">Balance</span>
          <span className="font-semibold">${wallet.balance.toFixed(2)}</span>
          <Button size="sm" variant="default" onClick={onCashOut} className="rounded-xl ml-2 flex items-center gap-1">
            <DollarSign className="h-4 w-4" /> Cash out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// -------------------- Builder --------------------
function Builder({ survey, onChange }) {
  const update = (patch) => onChange({ ...survey, ...patch });
  const updateQuestion = (id, patch) =>
    update({ questions: survey.questions.map((q) => (q.id === id ? { ...q, ...patch } : q)) });
  const removeQuestion = (id) => update({ questions: survey.questions.filter((q) => q.id !== id) });
  const addQuestion = (type) => {
    /** @type {Question} */
    const q =
      type === "mcq"
        ? { id: uid(), type, prompt: "Multiple choice question", required: false, options: ["Option 1", "Option 2"] }
        : type === "rating"
        ? { id: uid(), type, prompt: "Rate from 1–5", required: false, max: 5 }
        : { id: uid(), type, prompt: "Short answer question", required: false };
    update({ questions: [...survey.questions, q] });
  };

  return (
    <div className="grid md:grid-cols-3 gap-4">
      <Card className="md:col-span-2 rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Survey Details</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => addQuestion("text")} className="rounded-2xl"><Plus className="h-4 w-4 mr-1"/>Text</Button>
              <Button size="sm" variant="outline" onClick={() => addQuestion("mcq")} className="rounded-2xl"><Plus className="h-4 w-4 mr-1"/>MCQ</Button>
              <Button size="sm" variant="outline" onClick={() => addQuestion("rating")} className="rounded-2xl"><Plus className="h-4 w-4 mr-1"/>Rating</Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>Title</Label>
            <Input value={survey.title} onChange={(e) => update({ title: e.target.value })} placeholder="My awesome survey" className="rounded-2xl"/>
          </div>
          <div className="grid gap-2">
            <Label>Description</Label>
            <Textarea value={survey.description} onChange={(e) => update({ description: e.target.value })} placeholder="Explain what this survey is about" className="rounded-2xl"/>
          </div>

          <Separator className="my-2"/>

          <div className="space-y-4">
            <AnimatePresence>
              {survey.questions.map((q, idx) => (
                <motion.div key={q.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
                  <Card className="rounded-2xl border-slate-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center justify-between">
                        <span className="text-slate-700">Q{idx + 1} · {q.type.toUpperCase()}</span>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 text-sm text-slate-500">
                            <Switch checked={q.required} onCheckedChange={(v) => updateQuestion(q.id, { required: v })} />
                            <span>Required</span>
                          </div>
                          <Button size="icon" variant="ghost" onClick={() => removeQuestion(q.id)} className="rounded-xl text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid gap-2">
                        <Label>Prompt</Label>
                        <Input value={q.prompt} onChange={(e) => updateQuestion(q.id, { prompt: e.target.value })} className="rounded-2xl"/>
                      </div>

                      {q.type === "text" && (
                        <div className="text-sm text-slate-500">Short answer. Respondents will type a sentence or two.</div>
                      )}

                      {q.type === "mcq" && (
                        <div className="space-y-2">
                          <Label>Options</Label>
                          {q.options?.map((opt, i) => (
                            <div key={i} className="flex gap-2 items-center">
                              <Input value={opt} onChange={(e) => {
                                const next = [...(q.options || [])];
                                next[i] = e.target.value;
                                updateQuestion(q.id, { options: next });
                              }} className="rounded-2xl"/>
                              <Button size="icon" variant="ghost" onClick={() => {
                                const next = (q.options || []).filter((_, j) => j !== i);
                                updateQuestion(q.id, { options: next });
                              }} className="rounded-xl"><Trash2 className="h-4 w-4"/></Button>
                            </div>
                          ))}
                          <Button variant="outline" onClick={() => updateQuestion(q.id, { options: [...(q.options || []), `Option ${(q.options?.length||0)+1}`] })} className="rounded-2xl"><Plus className="h-4 w-4 mr-1"/>Add option</Button>
                        </div>
                      )}

                      {q.type === "rating" && (
                        <div className="grid gap-2 max-w-xs">
                          <Label>Max stars</Label>
                          <Select value={String(q.max || 5)} onValueChange={(v) => updateQuestion(q.id, { max: Number(v) })}>
                            <SelectTrigger className="rounded-2xl"><SelectValue placeholder="5"/></SelectTrigger>
                            <SelectContent>
                              {[3,4,5,7,10].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>

      <PreviewPanel survey={survey} />
    </div>
  );
}

function PreviewPanel({ survey }) {
  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader>
        <CardTitle>Live Preview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <h2 className="text-xl font-semibold">{survey.title || "Untitled survey"}</h2>
        {survey.description && <p className="text-slate-500 text-sm">{survey.description}</p>}
        <Separator />
        <div className="space-y-4">
          {survey.questions.length === 0 && (
            <p className="text-sm text-slate-500">No questions yet. Use the buttons above to add some.</p>
          )}
          {survey.questions.map((q) => (
            <div key={q.id} className="space-y-2">
              <p className="font-medium">{q.prompt}{q.required && <span className="text-red-500">*</span>}</p>
              {q.type === "text" && <Input placeholder="Your answer" className="rounded-2xl" readOnly />}
              {q.type === "mcq" && (
                <div className="flex flex-wrap gap-2">
                  {(q.options || []).map((opt, i) => (
                    <Button key={i} variant="outline" size="sm" className="rounded-2xl" disabled>{opt}</Button>
                  ))}
                </div>
              )}
              {q.type === "rating" && (
                <div className="flex gap-1">
                  {Array.from({ length: q.max || 5 }).map((_, i) => (
                    <div key={i} className="h-6 w-6 rounded-full bg-slate-200" />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// -------------------- Collector --------------------
function Collector({ survey, onSubmit }) {
  const [answers, setAnswers] = useState(/** @type {Record<string, string|number>} */({}));
  const [submitted, setSubmitted] = useState(false);

  const validate = () =>
    survey.questions.every((q) => !q.required || (answers[q.id] !== undefined && String(answers[q.id]).trim() !== ""));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return alert("Please answer all required questions.");
    onSubmit({ timestamp: Date.now(), answers });
    setSubmitted(true);
    setAnswers({});
  };

  if (submitted) {
    return (
      <Card className="rounded-2xl">
        <CardHeader><CardTitle>Thank you! 🎉</CardTitle></CardHeader>
        <CardContent>
          <p className="text-slate-600">Your response has been recorded locally and <span className="font-semibold">$100</span> has been added to your wallet (simulation).</p>
          <Button className="mt-3 rounded-2xl" onClick={() => setSubmitted(false)}>Submit another</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>{survey.title || "Survey"}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {survey.description && <p className="text-slate-500 mb-4">{survey.description}</p>}
        <div className="mb-3 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
          Complete the survey and earn <span className="font-semibold">${REWARD_PER_SUBMISSION}.00</span> to your wallet. (Demo only)
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          {survey.questions.map((q) => (
            <div key={q.id} className="space-y-2">
              <Label className="font-medium">{q.prompt}{q.required && <span className="text-red-500">*</span>}</Label>
              {q.type === "text" && (
                <Textarea
                  value={(answers[q.id] as string) || ""}
                  onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                  placeholder="Type your answer"
                  className="rounded-2xl"
                />
              )}
              {q.type === "mcq" && (
                <div className="flex flex-wrap gap-2">
                  {(q.options || []).map((opt, i) => {
                    const active = answers[q.id] === opt;
                    return (
                      <Button
                        type="button"
                        key={i}
                        variant={active ? "default" : "outline"}
                        className="rounded-2xl"
                        onClick={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
                      >
                        {opt}
                      </Button>
                    );
                  })}
                </div>
              )}
              {q.type === "rating" && (
                <div className="flex items-center gap-2">
                  {Array.from({ length: q.max || 5 }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      type="button"
                      aria-label={`Rate ${n}`}
                      className={`h-8 w-8 rounded-full border transition ${
                        (answers[q.id] || 0) >= n ? "bg-slate-900 text-white" : "bg-white"
                      }`}
                      onClick={() => setAnswers((a) => ({ ...a, [q.id]: n }))}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          <div className="pt-2">
            <Button type="submit" className="rounded-2xl">Submit & Earn ${REWARD_PER_SUBMISSION}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// -------------------- Results --------------------
function Results({ survey, responses, wallet }) {
  const total = responses.length;
  const byQuestion = useMemo(() => {
    const map = /** @type {Record<string, Array<string|number>>} */({});
    responses.forEach((r) => {
      Object.entries(r.answers).forEach(([qid, val]) => {
        map[qid] = map[qid] || [];
        map[qid].push(val);
      });
    });
    return map;
  }, [responses]);

  return (
    <div className="grid md:grid-cols-3 gap-4">
      <Card className="md:col-span-1 rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5"/>Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-600">
          <div className="flex justify-between"><span>Responses</span><span className="font-medium">{total}</span></div>
          <div className="flex justify-between"><span>Questions</span><span className="font-medium">{survey.questions.length}</span></div>
          <div className="flex justify-between"><span>Total Earnings</span><span className="font-medium">${(total * REWARD_PER_SUBMISSION).toFixed(2)}</span></div>
          <div className="flex justify-between"><span>Wallet Balance</span><span className="font-medium">${wallet.balance.toFixed(2)}</span></div>
        </CardContent>
      </Card>

      <div className="md:col-span-2 space-y-4">
        {survey.questions.map((q, idx) => (
          <Card key={q.id} className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Q{idx + 1}. {q.prompt}</CardTitle>
            </CardHeader>
            <CardContent>
              {q.type === "text" && (
                <div className="space-y-2">
                  {byQuestion[q.id]?.length ? (
                    <ul className="list-disc pl-6 space-y-1">
                      {byQuestion[q.id].map((a, i) => (
                        <li key={i} className="text-slate-700">{String(a)}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-500">No answers yet.</p>
                  )}
                </div>
              )}

              {q.type === "mcq" && (
                <DistributionChart data={countStrings(byQuestion[q.id] || [], q.options || [])} />
              )}

              {q.type === "rating" && (
                <DistributionChart data={countNumbers(byQuestion[q.id] || [], q.max || 5)} />
              )}
            </CardContent>
          </Card>
        ))}

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Payout History</CardTitle>
          </CardHeader>
          <CardContent>
            {wallet.payouts.length === 0 ? (
              <p className="text-sm text-slate-500">No payouts yet. Use the Cash out button once you have at least $100.</p>
            ) : (
              <ul className="text-sm space-y-2">
                {wallet.payouts.map((p) => (
                  <li key={p.id} className="flex justify-between">
                    <span>#{p.id}</span>
                    <span>${p.amount.toFixed(2)}</span>
                    <span>{new Date(p.timestamp).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DistributionChart({ data }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RBarChart data={data}>
          <XAxis dataKey="name" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="count" />
        </RBarChart>
      </ResponsiveContainer>
    </div>
  );
}

function countStrings(values, allOptions) {
  const counts = new Map();
  allOptions.forEach((o) => counts.set(o, 0));
  values.forEach((v) => counts.set(String(v), (counts.get(String(v)) || 0) + 1));
  return [...counts.entries()].map(([name, count]) => ({ name, count }));
}
function countNumbers(values, max) {
  const counts = new Map();
  for (let i = 1; i <= max; i++) counts.set(String(i), 0);
  values.forEach((v) => counts.set(String(v), (counts.get(String(v)) || 0) + 1));
  return [...counts.entries()].map(([name, count]) => ({ name, count }));
}

// -------------------- Export / Import --------------------
function ExportImport({ survey, setStore }) {
  const [copied, setCopied] = useState(false);

  const exportJSON = () => {
    const blob = new Blob([
      JSON.stringify({ survey, responses: [], wallet: { balance: 0, payouts: [] } }, null, 2)
    ], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(survey.title || "survey").toLowerCase().replace(/\s+/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  };

  const importJSON = async () => {
    try {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "application/json";
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;
        const text = await file.text();
        const parsed = JSON.parse(text);
        if (!parsed.survey) throw new Error("Invalid file");
        setStore({ survey: parsed.survey, responses: parsed.responses || [], wallet: parsed.wallet || { balance: 0, payouts: [] } });
      };
      input.click();
    } catch (e) {
      alert("Import failed. Ensure the JSON was exported from this app.");
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" onClick={exportJSON} className="rounded-2xl">Export</Button>
      <Button variant="outline" onClick={importJSON} className="rounded-2xl">Import</Button>
      <Button variant="ghost" onClick={copyLink} className="rounded-2xl flex items-center gap-2">
        {copied ? <Check className="h-4 w-4"/> : <Copy className="h-4 w-4"/>}
        {copied ? "Copied" : "Copy link"}
      </Button>
    </div>
  );
}
<script type="module">
  import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
  import {
    getAuth,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
  } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

  const app = initializeApp({
    apiKey: "YOUR_KEY",
    authDomain: "YOUR_DOMAIN.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
  });

  const auth = getAuth(app);

  // SIGN IN
  async function login(email, password) {
    const userCred = await signInWithEmailAndPassword(auth, email, password);
    console.log("Signed in:", userCred.user.uid);
  }

  // SIGN OUT
  async function logout() {
    await signOut(auth);
    console.log("Signed out");
  }

  // Listen to auth changes (optional)
  onAuthStateChanged(auth, (user) => {
    if (user) console.log("Authed:", user.email);
    else console.log("No user");
  });

  // Example usage:
  // login("test@example.com", "s
ecret123");
  // logout();
</script>
// npm i express jsonwebtoken cookie-parser bcrypt
import express from "express";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import bcrypt from "bcrypt";

const app = express();
app.use(express.json());
app.use(cookieParser());

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
const users = [{ id: 1, email: "a@b.com", passwordHash: await bcrypt.hash("secret123", 10) }];

// SIGN IN -> issues JWT in httpOnly cookie
app.post("/api/auth/sign-in", async (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ message: "Invalid credentials" });
  }
  const token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: "1d" });
  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 24 * 60 * 60 * 1000,
  });
  res.json({ ok: true });
});

// AUTH GUARD example
function requireAuth(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.sendStatus(401);
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.sendStatus(401);
  }
}

// SIGN OUT -> clears cookie
app.post("/api/auth/sign-out", (req, res) => {
  res.clearCookie("token");
  res.json({ ok: true });
});

app.get("/api/protected", requireAuth, (req, res) => {
  res.json({ secret: "🎟️", userId: req.user.sub });
});

app.liste
n(3000, () => 
console.log("http://localhost:3000"));
// npm i express jsonwebtoken cookie-parser bcrypt
import express from "express";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import bcrypt from "bcrypt";

const app = express();
app.use(express.json());
app.use(cookieParser());

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
const users = [{ id: 1, email: "a@b.com", passwordHash: await bcrypt.hash("secret123", 10) }];

// SIGN IN -> issues JWT in httpOnly cookie
app.post("/api/auth/sign-in", async (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ message: "Invalid credentials" });
  }
  const token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: "1d" });
  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 24 * 60 * 60 * 1000,
  });
  res.json({ ok: true });
});

// AUTH GUARD example
function requireAuth(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.sendStatus(401);
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.sendStatus(401);
  }
}

// SIGN OUT -> clears cookie
app.post("/api/auth/sign-out", (req, res) => {
  res.clearCookie("token");
  res.json({ ok: true });
});

app.get("/api/protected", requireAuth, (req, res) => {
  res.json({ secret: "🎟️", userId: req.user.sub });
});

app.listen(3000, () => console.log("http://localhost:3000"));
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

const handler = NextAuth({
  providers: [
    Credentials({
      name: "Credentials",
      credentials: { email: {}, password: {} },
      async authorize(creds) {
        // Validate user however you like:
        if (creds?.email === "a@b.com" && creds?.password === "secret123") {
          return { id: "1", email: "a@b.com" };
        }
        return null;
      },
    }),
  ],
  session: { strategy: "jwt" },
});
export { handler as GET,
 handler as POST };
"use client";
import { signIn, signOut } from "next-auth/react";

// Sign in
await signIn("credentials", {
  email: "a@b.com",
  password: "secret123",
  redirect: false,
});

// Sign out
await signOut({ redirect
: false });
import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart as RBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Plus, Trash2, BarChart3, Copy, Check } from "lucide-react";

// shadcn/ui components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

// -------------------- Types --------------------
/** @typedef {"text"|"mcq"|"rating"} QType */

/** @typedef {{ id: string; type: QType; prompt: string; required: boolean; options?: string[]; max?: number }} Question */
/** @typedef {{ title: string; description: string; questions: Question[] }} Survey */
/** @typedef {{ timestamp: number; answers: Record<string, string|number> }} Response */

// -------------------- Utils --------------------
const uid = () => Math.random().toString(36).slice(2, 9);
const LS_KEY = "survey_app_v1";

function useLocalStorage(key, initial) {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {}
  }, [key, state]);
  return [state, setState];
}

// -------------------- Main App --------------------
export default function SurveyApp() {
  const [store, setStore] = useLocalStorage(LS_KEY, {
    survey: /** @type {Survey} */ ({
      title: "Customer Feedback",
      description: "Help us improve by answering a few quick questions.",
      questions: [
        { id: uid(), type: "rating", prompt: "Rate your overall experience", required: true, max: 5 },
        { id: uid(), type: "mcq", prompt: "What did you like most?", required: false, options: ["Design", "Performance", "Price", "Support"] },
        { id: uid(), type: "text", prompt: "Any suggestions?", required: false },
      ],
    }),
    responses: /** @type {Response[]} */ ([]),
  });

  const { survey, responses } = store;
  const [tab, setTab] = useState("build");

  const saveSurvey = (nextSurvey) => setStore((s) => ({ ...s, survey: nextSurvey }));
  const addResponse = (resp) => setStore((s) => ({ ...s, responses: [...s.responses, resp] }));
  const resetData = () => setStore({ survey: { title: "New Survey", description: "", questions: [] }, responses: [] });

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-900 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">📋 Survey App</h1>
            <p className="text-sm text-slate-500">Build, collect, and analyze—no backend needed (data lives in your browser).</p>
          </div>
          <div className="flex items-center gap-2">
            <ExportImport survey={survey} setStore={setStore} />
            <Button variant="destructive" onClick={resetData} className="rounded-2xl">Reset</Button>
          </div>
        </header>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 rounded-2xl">
            <TabsTrigger value="build">Build</TabsTrigger>
            <TabsTrigger value="collect">Collect</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
          </TabsList>

          <TabsContent value="build" className="mt-4">
            <Builder survey={survey} onChange={saveSurvey} />
          </TabsContent>
          <TabsContent value="collect" className="mt-4">
            <Collector survey={survey} onSubmit={addResponse} />
          </TabsContent>
          <TabsContent value="results" className="mt-4">
            <Results survey={survey} responses={responses} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// -------------------- Builder --------------------
function Builder({ survey, onChange }) {
  const update = (patch) => onChange({ ...survey, ...patch });
  const updateQuestion = (id, patch) =>
    update({ questions: survey.questions.map((q) => (q.id === id ? { ...q, ...patch } : q)) });
  const removeQuestion = (id) => update({ questions: survey.questions.filter((q) => q.id !== id) });
  const addQuestion = (type) => {
    /** @type {Question} */
    const q =
      type === "mcq"
        ? { id: uid(), type, prompt: "Multiple choice question", required: false, options: ["Option 1", "Option 2"] }
        : type === "rating"
        ? { id: uid(), type, prompt: "Rate from 1–5", required: false, max: 5 }
        : { id: uid(), type, prompt: "Short answer question", required: false };
    update({ questions: [...survey.questions, q] });
  };

  return (
    <div className="grid md:grid-cols-3 gap-4">
      <Card className="md:col-span-2 rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Survey Details</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => addQuestion("text")} className="rounded-2xl"><Plus className="h-4 w-4 mr-1"/>Text</Button>
              <Button size="sm" variant="outline" onClick={() => addQuestion("mcq")} className="rounded-2xl"><Plus className="h-4 w-4 mr-1"/>MCQ</Button>
              <Button size="sm" variant="outline" onClick={() => addQuestion("rating")} className="rounded-2xl"><Plus className="h-4 w-4 mr-1"/>Rating</Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>Title</Label>
            <Input value={survey.title} onChange={(e) => update({ title: e.target.value })} placeholder="My awesome survey" className="rounded-2xl"/>
          </div>
          <div className="grid gap-2">
            <Label>Description</Label>
            <Textarea value={survey.description} onChange={(e) => update({ description: e.target.value })} placeholder="Explain what this survey is about" className="rounded-2xl"/>
          </div>

          <Separator className="my-2"/>

          <div className="space-y-4">
            <AnimatePresence>
              {survey.questions.map((q, idx) => (
                <motion.div key={q.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
                  <Card className="rounded-2xl border-slate-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center justify-between">
                        <span className="text-slate-700">Q{idx + 1} · {q.type.toUpperCase()}</span>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 text-sm text-slate-500">
                            <Switch checked={q.required} onCheckedChange={(v) => updateQuestion(q.id, { required: v })} />
                            <span>Required</span>
                          </div>
                          <Button size="icon" variant="ghost" onClick={() => removeQuestion(q.id)} className="rounded-xl text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid gap-2">
                        <Label>Prompt</Label>
                        <Input value={q.prompt} onChange={(e) => updateQuestion(q.id, { prompt: e.target.value })} className="rounded-2xl"/>
                      </div>

                      {q.type === "text" && (
                        <div className="text-sm text-slate-500">Short answer. Respondents will type a sentence or two.</div>
                      )}

                      {q.type === "mcq" && (
                        <div className="space-y-2">
                          <Label>Options</Label>
                          {q.options?.map((opt, i) => (
                            <div key={i} className="flex gap-2 items-center">
                              <Input value={opt} onChange={(e) => {
                                const next = [...(q.options || [])];
                                next[i] = e.target.value;
                                updateQuestion(q.id, { options: next });
                              }} className="rounded-2xl"/>
                              <Button size="icon" variant="ghost" onClick={() => {
                                const next = (q.options || []).filter((_, j) => j !== i);
                                updateQuestion(q.id, { options: next });
                              }} className="rounded-xl"><Trash2 className="h-4 w-4"/></Button>
                            </div>
                          ))}
                          <Button variant="outline" onClick={() => updateQuestion(q.id, { options: [...(q.options || []), `Option ${(q.options?.length||0)+1}`] })} className="rounded-2xl"><Plus className="h-4 w-4 mr-1"/>Add option</Button>
                        </div>
                      )}

                      {q.type === "rating" && (
                        <div className="grid gap-2 max-w-xs">
                          <Label>Max stars</Label>
                          <Select value={String(q.max || 5)} onValueChange={(v) => updateQuestion(q.id, { max: Number(v) })}>
                            <SelectTrigger className="rounded-2xl"><SelectValue placeholder="5"/></SelectTrigger>
                            <SelectContent>
                              {[3,4,5,7,10].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>

      <PreviewPanel survey={survey} />
    </div>
  );
}

function PreviewPanel({ survey }) {
  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader>
        <CardTitle>Live Preview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <h2 className="text-xl font-semibold">{survey.title || "Untitled survey"}</h2>
        {survey.description && <p className="text-slate-500 text-sm">{survey.description}</p>}
        <Separator />
        <div className="space-y-4">
          {survey.questions.length === 0 && (
            <p className="text-sm text-slate-500">No questions yet. Use the buttons above to add some.</p>
          )}
          {survey.questions.map((q) => (
            <div key={q.id} className="space-y-2">
              <p className="font-medium">{q.prompt}{q.required && <span className="text-red-500">*</span>}</p>
              {q.type === "text" && <Input placeholder="Your answer" className="rounded-2xl" readOnly />}
              {q.type === "mcq" && (
                <div className="flex flex-wrap gap-2">
                  {(q.options || []).map((opt, i) => (
                    <Button key={i} variant="outline" size="sm" className="rounded-2xl" disabled>{opt}</Button>
                  ))}
                </div>
              )}
              {q.type === "rating" && (
                <div className="flex gap-1">
                  {Array.from({ length: q.max || 5 }).map((_, i) => (
                    <div key={i} className="h-6 w-6 rounded-full bg-slate-200" />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// -------------------- Collector --------------------
function Collector({ survey, onSubmit }) {
  const [answers, setAnswers] = useState(/** @type {Record<string, string|number>} */({}));
  const [submitted, setSubmitted] = useState(false);

  const validate = () =>
    survey.questions.every((q) => !q.required || (answers[q.id] !== undefined && String(answers[q.id]).trim() !== ""));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return alert("Please answer all required questions.");
    onSubmit({ timestamp: Date.now(), answers });
    setSubmitted(true);
    setAnswers({});
  };

  if (submitted) {
    return (
      <Card className="rounded-2xl">
        <CardHeader><CardTitle>Thank you! 🎉</CardTitle></CardHeader>
        <CardContent>
          <p className="text-slate-600">Your response has been recorded locally. You can refresh the page and it will still be there.</p>
          <Button className="mt-3 rounded-2xl" onClick={() => setSubmitted(false)}>Submit another</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>{survey.title || "Survey"}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {survey.description && <p className="text-slate-500 mb-4">{survey.description}</p>}
        <form onSubmit={handleSubmit} className="space-y-5">
          {survey.questions.map((q) => (
            <div key={q.id} className="space-y-2">
              <Label className="font-medium">{q.prompt}{q.required && <span className="text-red-500">*</span>}</Label>
              {q.type === "text" && (
                <Textarea
                  value={(answers[q.id] as string) || ""}
                  onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                  placeholder="Type your answer"
                  className="rounded-2xl"
                />
              )}
              {q.type === "mcq" && (
                <div className="flex flex-wrap gap-2">
                  {(q.options || []).map((opt, i) => {
                    const active = answers[q.id] === opt;
                    return (
                      <Button
                        type="button"
                        key={i}
                        variant={active ? "default" : "outline"}
                        className="rounded-2xl"
                        onClick={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
                      >
                        {opt}
                      </Button>
                    );
                  })}
                </div>
              )}
              {q.type === "rating" && (
                <div className="flex items-center gap-2">
                  {Array.from({ length: q.max || 5 }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      type="button"
                      aria-label={`Rate ${n}`}
                      className={`h-8 w-8 rounded-full border transition ${
                        (answers[q.id] || 0) >= n ? "bg-slate-900 text-white" : "bg-white"
                      }`}
                      onClick={() => setAnswers((a) => ({ ...a, [q.id]: n }))}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          <div className="pt-2">
            <Button type="submit" className="rounded-2xl">Submit</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// -------------------- Results --------------------
function Results({ survey, responses }) {
  const total = responses.length;
  const byQuestion = useMemo(() => {
    const map = /** @type {Record<string, Array<string|number>>} */({});
    responses.forEach((r) => {
      Object.entries(r.answers).forEach(([qid, val]) => {
        map[qid] = map[qid] || [];
        map[qid].push(val);
      });
    });
    return map;
  }, [responses]);

  return (
    <div className="grid md:grid-cols-3 gap-4">
      <Card className="md:col-span-1 rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5"/>Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-600">
          <div className="flex justify-between"><span>Responses</span><span className="font-medium">{total}</span></div>
          <div className="flex justify-between"><span>Questions</span><span className="font-medium">{survey.questions.length}</span></div>
        </CardContent>
      </Card>

      <div className="md:col-span-2 space-y-4">
        {survey.questions.map((q, idx) => (
          <Card key={q.id} className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Q{idx + 1}. {q.prompt}</CardTitle>
            </CardHeader>
            <CardContent>
              {q.type === "text" && (
                <div className="space-y-2">
                  {byQuestion[q.id]?.length ? (
                    <ul className="list-disc pl-6 space-y-1">
                      {byQuestion[q.id].map((a, i) => (
                        <li key={i} className="text-slate-700">{String(a)}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-500">No answers yet.</p>
                  )}
                </div>
              )}

              {q.type === "mcq" && (
                <DistributionChart data={countStrings(byQuestion[q.id] || [], q.options || [])} />
              )}

              {q.type === "rating" && (
                <DistributionChart data={countNumbers(byQuestion[q.id] || [], q.max || 5)} />
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function DistributionChart({ data }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RBarChart data={data}>
          <XAxis dataKey="name" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="count" />
        </RBarChart>
      </ResponsiveContainer>
    </div>
  );
}

function countStrings(values, allOptions) {
  const counts = new Map();
  allOptions.forEach((o) => counts.set(o, 0));
  values.forEach((v) => counts.set(String(v), (counts.get(String(v)) || 0) + 1));
  return [...counts.entries()].map(([name, count]) => ({ name, count }));
}
function countNumbers(values, max) {
  const counts = new Map();
  for (let i = 1; i <= max; i++) counts.set(String(i), 0);
  values.forEach((v) => counts.set(String(v), (counts.get(String(v)) || 0) + 1));
  return [...counts.entries()].map(([name, count]) => ({ name, count }));
}

// -------------------- Export / Import --------------------
function ExportImport({ survey, setStore }) {
  const [copied, setCopied] = useState(false);

  const exportJSON = () => {
    const blob = new Blob([
      JSON.stringify({ survey, responses: [] }, null, 2)
    ], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(survey.title || "survey").toLowerCase().replace(/\s+/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      set
import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart as RBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Plus, Trash2, BarChart3, Copy, Check } from "lucide-react";

// shadcn/ui components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

// -------------------- Types --------------------
/** @typedef {"text"|"mcq"|"rating"} QType */

/** @typedef {{ id: string; type: QType; prompt: string; required: boolean; options?: string[]; max?: number }} Question */
/** @typedef {{ title: string; description: string; questions: Question[] }} Survey */
/** @typedef {{ timestamp: number; answers: Record<string, string|number> }} Response */

// -------------------- Utils --------------------
const uid = () => Math.random().toString(36).slice(2, 9);
const LS_KEY = "survey_app_v1";

function useLocalStorage(key, initial) {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {}
  }, [key, state]);
  return [state, setState];
}

// -------------------- Main App --------------------
export default function SurveyApp() {
  const [store, setStore] = useLocalStorage(LS_KEY, {
    survey: /** @type {Survey} */ ({
      title: "Customer Feedback",
      description: "Help us improve by answering a few quick questions.",
      questions: [
        { id: uid(), type: "rating", prompt: "Rate your overall experience", required: true, max: 5 },
        { id: uid(), type: "mcq", prompt: "What did you like most?", required: false, options: ["Design", "Performance", "Price", "Support"] },
        { id: uid(), type: "text", prompt: "Any suggestions?", required: false },
      ],
    }),
    responses: /** @type {Response[]} */ ([]),
  });

  const { survey, responses } = store;
  const [tab, setTab] = useState("build");

  const saveSurvey = (nextSurvey) => setStore((s) => ({ ...s, survey: nextSurvey }));
  const addResponse = (resp) => setStore((s) => ({ ...s, responses: [...s.responses, resp] }));
  const resetData = () => setStore({ survey: { title: "New Survey", description: "", questions: [] }, responses: [] });

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-900 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">📋 Survey App</h1>
            <p className="text-sm text-slate-500">Build, collect, and analyze—no backend needed (data lives in your browser).</p>
          </div>
          <div className="flex items-center gap-2">
            <ExportImport survey={survey} setStore={setStore} />
            <Button variant="destructive" onClick={resetData} className="rounded-2xl">Reset</Button>
          </div>
        </header>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 rounded-2xl">
            <TabsTrigger value="build">Build</TabsTrigger>
            <TabsTrigger value="collect">Collect</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
          </TabsList>

          <TabsContent value="build" className="mt-4">
            <Builder survey={survey} onChange={saveSurvey} />
          </TabsContent>
          <TabsContent value="collect" className="mt-4">
            <Collector survey={survey} onSubmit={addResponse} />
          </TabsContent>
          <TabsContent value="results" className="mt-4">
            <Results survey={survey} responses={responses} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// -------------------- Builder --------------------
function Builder({ survey, onChange }) {
  const update = (patch) => onChange({ ...survey, ...patch });
  const updateQuestion = (id, patch) =>
    update({ questions: survey.questions.map((q) => (q.id === id ? { ...q, ...patch } : q)) });
  const removeQuestion = (id) => update({ questions: survey.questions.filter((q) => q.id !== id) });
  const addQuestion = (type) => {
    /** @type {Question} */
    const q =
      type === "mcq"
        ? { id: uid(), type, prompt: "Multiple choice question", required: false, options: ["Option 1", "Option 2"] }
        : type === "rating"
        ? { id: uid(), type, prompt: "Rate from 1–5", required: false, max: 5 }
        : { id: uid(), type, prompt: "Short answer question", required: false };
    update({ questions: [...survey.questions, q] });
  };

  return (
    <div className="grid md:grid-cols-3 gap-4">
      <Card className="md:col-span-2 rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Survey Details</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => addQuestion("text")} className="rounded-2xl"><Plus className="h-4 w-4 mr-1"/>Text</Button>
              <Button size="sm" variant="outline" onClick={() => addQuestion("mcq")} className="rounded-2xl"><Plus className="h-4 w-4 mr-1"/>MCQ</Button>
              <Button size="sm" variant="outline" onClick={() => addQuestion("rating")} className="rounded-2xl"><Plus className="h-4 w-4 mr-1"/>Rating</Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>Title</Label>
            <Input value={survey.title} onChange={(e) => update({ title: e.target.value })} placeholder="My awesome survey" className="rounded-2xl"/>
          </div>
          <div className="grid gap-2">
            <Label>Description</Label>
            <Textarea value={survey.description} onChange={(e) => update({ description: e.target.value })} placeholder="Explain what this survey is about" className="rounded-2xl"/>
          </div>

          <Separator className="my-2"/>

          <div className="space-y-4">
            <AnimatePresence>
              {survey.questions.map((q, idx) => (
                <motion.div key={q.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
                  <Card className="rounded-2xl border-slate-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center justify-between">
                        <span className="text-slate-700">Q{idx + 1} · {q.type.toUpperCase()}</span>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 text-sm text-slate-500">
                            <Switch checked={q.required} onCheckedChange={(v) => updateQuestion(q.id, { required: v })} />
                            <span>Required</span>
                          </div>
                          <Button size="icon" variant="ghost" onClick={() => removeQuestion(q.id)} className="rounded-xl text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid gap-2">
                        <Label>Prompt</Label>
                        <Input value={q.prompt} onChange={(e) => updateQuestion(q.id, { prompt: e.target.value })} className="rounded-2xl"/>
                      </div>

                      {q.type === "text" && (
                        <div className="text-sm text-slate-500">Short answer. Respondents will type a sentence or two.</div>
                      )}

                      {q.type === "mcq" && (
                        <div className="space-y-2">
                          <Label>Options</Label>
                          {q.options?.map((opt, i) => (
                            <div key={i} className="flex gap-2 items-center">
                              <Input value={opt} onChange={(e) => {
                                const next = [...(q.options || [])];
                                next[i] = e.target.value;
                                updateQuestion(q.id, { options: next });
                              }} className="rounded-2xl"/>
                              <Button size="icon" variant="ghost" onClick={() => {
                                const next = (q.options || []).filter((_, j) => j !== i);
                                updateQuestion(q.id, { options: next });
                              }} className="rounded-xl"><Trash2 className="h-4 w-4"/></Button>
                            </div>
                          ))}
                          <Button variant="outline" onClick={() => updateQuestion(q.id, { options: [...(q.options || []), `Option ${(q.options?.length||0)+1}`] })} className="rounded-2xl"><Plus className="h-4 w-4 mr-1"/>Add option</Button>
                        </div>
                      )}

                      {q.type === "rating" && (
                        <div className="grid gap-2 max-w-xs">
                          <Label>Max stars</Label>
                          <Select value={String(q.max || 5)} onValueChange={(v) => updateQuestion(q.id, { max: Number(v) })}>
                            <SelectTrigger className="rounded-2xl"><SelectValue placeholder="5"/></SelectTrigger>
                            <SelectContent>
                              {[3,4,5,7,10].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>

      <PreviewPanel survey={survey} />
    </div>
  );
}

function PreviewPanel({ survey }) {
  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader>
        <CardTitle>Live Preview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <h2 className="text-xl font-semibold">{survey.title || "Untitled survey"}</h2>
        {survey.description && <p className="text-slate-500 text-sm">{survey.description}</p>}
        <Separator />
        <div className="space-y-4">
          {survey.questions.length === 0 && (
            <p className="text-sm text-slate-500">No questions yet. Use the buttons above to add some.</p>
          )}
          {survey.questions.map((q) => (
            <div key={q.id} className="space-y-2">
              <p className="font-medium">{q.prompt}{q.required && <span className="text-red-500">*</span>}</p>
              {q.type === "text" && <Input placeholder="Your answer" className="rounded-2xl" readOnly />}
              {q.type === "mcq" && (
                <div className="flex flex-wrap gap-2">
                  {(q.options || []).map((opt, i) => (
                    <Button key={i} variant="outline" size="sm" className="rounded-2xl" disabled>{opt}</Button>
                  ))}
                </div>
              )}
              {q.type === "rating" && (
                <div className="flex gap-1">
                  {Array.from({ length: q.max || 5 }).map((_, i) => (
                    <div key={i} className="h-6 w-6 rounded-full bg-slate-200" />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// -------------------- Collector --------------------
function Collector({ survey, onSubmit }) {
  const [answers, setAnswers] = useState(/** @type {Record<string, string|number>} */({}));
  const [submitted, setSubmitted] = useState(false);

  const validate = () =>
    survey.questions.every((q) => !q.required || (answers[q.id] !== undefined && String(answers[q.id]).trim() !== ""));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return alert("Please answer all required questions.");
    onSubmit({ timestamp: Date.now(), answers });
    setSubmitted(true);
    setAnswers({});
  };

  if (submitted) {
    return (
      <Card className="rounded-2xl">
        <CardHeader><CardTitle>Thank you! 🎉</CardTitle></CardHeader>
        <CardContent>
          <p className="text-slate-600">Your response has been recorded locally. You can refresh the page and it will still be there.</p>
          <Button className="mt-3 rounded-2xl" onClick={() => setSubmitted(false)}>Submit another</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>{survey.title || "Survey"}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {survey.description && <p className="text-slate-500 mb-4">{survey.description}</p>}
        <form onSubmit={handleSubmit} className="space-y-5">
          {survey.questions.map((q) => (
            <div key={q.id} className="space-y-2">
              <Label className="font-medium">{q.prompt}{q.required && <span className="text-red-500">*</span>}</Label>
              {q.type === "text" && (
                <Textarea
                  value={(answers[q.id] as string) || ""}
                  onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                  placeholder="Type your answer"
                  className="rounded-2xl"
                />
              )}
              {q.type === "mcq" && (
                <div className="flex flex-wrap gap-2">
                  {(q.options || []).map((opt, i) => {
                    const active = answers[q.id] === opt;
                    return (
                      <Button
                        type="button"
                        key={i}
                        variant={active ? "default" : "outline"}
                        className="rounded-2xl"
                        onClick={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
                      >
                        {opt}
                      </Button>
                    );
                  })}
                </div>
              )}
              {q.type === "rating" && (
                <div className="flex items-center gap-2">
                  {Array.from({ length: q.max || 5 }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      type="button"
                      aria-label={`Rate ${n}`}
                      className={`h-8 w-8 rounded-full border transition ${
                        (answers[q.id] || 0) >= n ? "bg-slate-900 text-white" : "bg-white"
                      }`}
                      onClick={() => setAnswers((a) => ({ ...a, [q.id]: n }))}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          <div className="pt-2">
            <Button type="submit" className="rounded-2xl">Submit</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// -------------------- Results --------------------
function Results({ survey, responses }) {
  const total = responses.length;
  const byQuestion = useMemo(() => {
    const map = /** @type {Record<string, Array<string|number>>} */({});
    responses.forEach((r) => {
      Object.entries(r.answers).forEach(([qid, val]) => {
        map[qid] = map[qid] || [];
        map[qid].push(val);
      });
    });
    return map;
  }, [responses]);

  return (
    <div className="grid md:grid-cols-3 gap-4">
      <Card className="md:col-span-1 rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5"/>Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-600">
          <div className="flex justify-between"><span>Responses</span><span className="font-medium">{total}</span></div>
          <div className="flex justify-between"><span>Questions</span><span className="font-medium">{survey.questions.length}</span></div>
        </CardContent>
      </Card>

      <div className="md:col-span-2 space-y-4">
        {survey.questions.map((q, idx) => (
          <Card key={q.id} className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Q{idx + 1}. {q.prompt}</CardTitle>
            </CardHeader>
            <CardContent>
              {q.type === "text" && (
                <div className="space-y-2">
                  {byQuestion[q.id]?.length ? (
                    <ul className="list-disc pl-6 space-y-1">
                      {byQuestion[q.id].map((a, i) => (
                        <li key={i} className="text-slate-700">{String(a)}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-500">No answers yet.</p>
                  )}
                </div>
              )}

              {q.type === "mcq" && (
                <DistributionChart data={countStrings(byQuestion[q.id] || [], q.options || [])} />
              )}

              {q.type === "rating" && (
                <DistributionChart data={countNumbers(byQuestion[q.id] || [], q.max || 5)} />
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function DistributionChart({ data }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RBarChart data={data}>
          <XAxis dataKey="name" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="count" />
        </RBarChart>
      </ResponsiveContainer>
    </div>
  );
}

function countStrings(values, allOptions) {
  const counts = new Map();
  allOptions.forEach((o) => counts.set(o, 0));
  values.forEach((v) => counts.set(String(v), (counts.get(String(v)) || 0) + 1));
  return [...counts.entries()].map(([name, count]) => ({ name, count }));
}
function countNumbers(values, max) {
  const counts = new Map();
  for (let i = 1; i <= max; i++) counts.set(String(i), 0);
  values.forEach((v) => counts.set(String(v), (counts.get(String(v)) || 0) + 1));
  return [...counts.entries()].map(([name, count]) => ({ name, count }));
}

// -------------------- Export / Import --------------------
function ExportImport({ survey, setStore }) {
  const [copied, setCopied] = useState(false);

  const exportJSON = () => {
    const blob = new Blob([
      JSON.stringify({ survey, responses: [] }, null, 2)
    ], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(survey.title || "survey").toLowerCase().replace(/\s+/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      set
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Google Pay – Web Demo (TEST)</title>
  <style>
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, 'Helvetica Neue', Arial, 'Noto Sans', 'Apple Color Emoji', 'Segoe UI Emoji'; padding: 2rem; }
    .wrap { max-width: 720px; margin: 0 auto; }
    .card { border: 1px solid #e5e7eb; border-radius: 16px; padding: 1.25rem; box-shadow: 0 2px 16px rgba(0,0,0,.06); }
    .row { display: flex; align-items: center; justify-content: space-between; }
    .row > * { margin: .35rem 0; }
    .price { font-size: 1.25rem; font-weight: 700; }
    #status { margin-top: 1rem; white-space: pre-wrap; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-size: .95rem; }
    .muted { color: #6b7280; }
  </style>
  <!-- Load Google Pay JS -->
  <script async src="https://pay.google.com/gp/p/js/pay.js"></script>
</head>
<body>
  <div class="wrap">
    <h1>Google Pay – Web Demo <small class="muted">(Environment: TEST)</small></h1>

    <div class="card">
      <div class="row">
        <div>
          <div>Awesome Product</div>
          <div class="muted">One-time purchase</div>
        </div>
        <div class="price">ZAR 199.99</div>
      </div>

      <div id="gpay-container" style="margin-top: 12px;"></div>
      <div id="status" class="muted">Loading Google Pay…</div>
    </div>

    <p class="muted" style="margin-top:1rem">
      This demo uses the <strong>example gateway</strong> in TEST mode. Replace the tokenization settings and merchant info before going live.
    </p>
  </div>

  <script>
    // ---- Config -----------------------------------------------------------
    const baseCardPaymentMethod = {
      type: 'CARD',
      parameters: {
        allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
        allowedCardNetworks: ['AMEX', 'DISCOVER', 'JCB', 'MASTERCARD', 'VISA'],
        billingAddressRequired: true,
        billingAddressParameters: { format: 'FULL' }
      }
    };

    // TEST tokenization (returns a fake token). For production, replace with your gateway.
    const tokenizationSpecification = {
      type: 'PAYMENT_GATEWAY',
      parameters: {
        gateway: 'example',
        gatewayMerchantId: 'exampleGatewayMerchantId'
      }
    };

    const cardPaymentMethod = {
      ...baseCardPaymentMethod,
      tokenizationSpecification
    };

    const merchantInfo = {
      // For PRODUCTION you must set your merchantId assigned by Google.
      // merchantId: '12345678901234567890',
      merchantName: 'Demo Store'
    };

    const transactionInfo = {
      totalPriceStatus: 'FINAL',
      totalPrice: '199.99',
      currencyCode: 'ZAR',
      countryCode: 'ZA'
    };

    // ---- Bootstrap --------------------------------------------------------
    let paymentsClient;

    function getPaymentsClient() {
      if (!paymentsClient) {
        paymentsClient = new google.payments.api.PaymentsClient({
          environment: 'TEST' // Change to 'PRODUCTION' when going live
        });
      }
      return paymentsClient;
    }

    function getIsReadyToPayRequest() {
      return {
        apiVersion: 2,
        apiVersionMinor: 0,
        allowedPaymentMethods: [baseCardPaymentMethod]
      };
    }

    function getPaymentDataRequest() {
      return {
        apiVersion: 2,
        apiVersionMinor: 0,
        allowedPaymentMethods: [cardPaymentMethod],
        merchantInfo,
        transactionInfo,
        callbackIntents: [] // you can add 'PAYMENT_AUTHORIZATION' for advanced flows
      };
    }

    function addGooglePayButton() {
      const button = getPaymentsClient().createButton({
        onClick: onGooglePayButtonClicked,
        buttonType: 'buy',
        buttonSizeMode: 'fill',
      });
      document.getElementById('gpay-container').appendChild(button);
    }

    function showStatus(msg, isError = false) {
      const s = document.getElementById('status');
      s.textContent = msg;
      s.style.color = isError ? '#b91c1c' : '#6b7280';
    }

    async function onGooglePayButtonClicked() {
      showStatus('Opening Google Pay…');
      try {
        const paymentData = await getPaymentsClient().loadPaymentData(
          getPaymentDataRequest()
        );
        // The token you need to charge on the server:
        const token = paymentData.paymentMethodData.tokenizationData.token;

        // Send to your server for processing (example):
        // await fetch('/api/charge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, orderId: 'abc123' }) });

        showStatus('Success! Token received.\n\n' + token);
      } catch (err) {
        if (err.statusCode === 'CANCELED') {
          showStatus('Payment canceled by user.');
        } else {
          showStatus('Error: ' + (err.statusMessage || err.message || err));
          console.error(err);
        }
      }
    }

    async function onGooglePayLoaded() {
      try {
        const req = getIsReadyToPayRequest();
        const res = await getPaymentsClient().isReadyToPay(req);
        if (res.result) {
          addGooglePayButton();
          showStatus('Ready to pay with Google Pay.');
        } else {
          showStatus('Google Pay is not available on this device/browser.', true);
        }
      } catch (e) {
        showStatus('Failed to load Google Pay: ' + e.message, true);
      }
    }

    // Google Pay script calls this if present when it loads
    window.onGooglePayLoaded = onGooglePayLoaded;

    // Fallback: if callback is not triggered (older script), try init after a short delay
    window.addEventListener('load', () => setTimeout(onGooglePayLoaded, 600));
  </script>
</body>
</html>
import React, { useEffect, useMemo, useState } from "react";

/**
 * Survey Scorpio – single‑file demo app
 * Features:
 * - Email/password auth (client-side demo only; do NOT use in production)
 * - Create surveys (title, reward, questions: multiple choice or short text)
 * - Take surveys, earn balance, prevent repeat submissions per survey
 * - Admin flag (first registered user becomes admin)
 * - LocalStorage persistence
 *
 * Notes:
 * - Replace the mock auth with real backend or Firebase for production.
 * - All data lives in localStorage under key "scorpio:v1".
 */

export default function App() {
  const [route, setRoute] = useState("/auth");
  const [store, setStore] = useLocalStorage();
  const currentUser = store.users[store.session?.uid || ""] || null;

  useEffect(() => {
    if (currentUser) setRoute("/dashboard");
  }, []);

  function signOut() {
    setStore((s) => ({ ...s, session: null }));
    setRoute("/auth");
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Header currentUser={currentUser} onSignOut={signOut} />

      <main className="max-w-6xl mx-auto p-4 grid gap-4">
        {!currentUser && <Auth onAuthed={() => setRoute("/dashboard")} />}

        {currentUser && route === "/dashboard" && (
          <Dashboard
            store={store}
            setStore={setStore}
            goto={(r) => setRoute(r)}
            currentUser={currentUser}
          />
        )}

        {currentUser && route === "/create" && (
          <CreateSurvey
            store={store}
            setStore={setStore}
            onBack={() => setRoute("/dashboard")}
            currentUser={currentUser}
          />
        )}

        {currentUser && route.startsWith("/take/") && (
          <TakeSurvey
            store={store}
            setStore={setStore}
            onBack={() => setRoute("/dashboard")}
            surveyId={route.split("/").pop()!}
            currentUser={currentUser}
          />
        )}
      </main>

      <Footer />
    </div>
  );
}

function Header({ currentUser, onSignOut }: { currentUser: User | null; onSignOut: () => void }) {
  return (
    <header className="border-b bg-white">
      <div className="max-w-6xl mx-auto p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-2xl bg-indigo-600 text-white grid place-content-center font-bold">S</div>
          <div>
            <div className="font-semibold text-lg">Survey Scorpio</div>
            <div className="text-xs text-gray-500">Create. Answer. Earn.</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {currentUser ? (
            <>
              <span className="text-sm text-gray-600">Hi, {currentUser.email}</span>
              <button onClick={onSignOut} className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm">
                Sign out
              </button>
            </>
          ) : (
            <span className="text-sm text-gray-600">Welcome</span>
          )}
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-10 py-10 text-center text-xs text-gray-500">
      Demo only – replace localStorage and mock auth with a real backend.
    </footer>
  );
}

// ------------------- Auth -------------------
function Auth({ onAuthed }: { onAuthed: () => void }) {
  const { setStore } = useLocalStorageCtx();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setStore((s) => {
      const users = { ...s.users };
      const byEmail = Object.values(users).find((u) => u.email === email);

      if (mode === "signup") {
        if (byEmail) throw new Error("Email already registered");
        const uid = rid();
        const isFirstUser = Object.keys(users).length === 0;
        users[uid] = {
          uid,
          email,
          passwordHash: hash(password),
          balance: 0,
          isAdmin: isFirstUser, // first user becomes admin
          taken: {},
        };
        return { ...s, users, session: { uid } };
      } else {
        if (!byEmail) throw new Error("Account not found");
        if (byEmail.passwordHash !== hash(password)) throw new Error("Wrong password");
        return { ...s, session: { uid: byEmail.uid } };
      }
    });
    onAuthed();
  }

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-2xl shadow">
      <div className="flex gap-2 mb-4">
        <button
          className={`px-3 py-1.5 rounded-xl text-sm ${mode === "signup" ? "bg-indigo-600 text-white" : "bg-gray-100"}`}
          onClick={() => setMode("signup")}
        >
          Sign up
        </button>
        <button
          className={`px-3 py-1.5 rounded-xl text-sm ${mode === "signin" ? "bg-indigo-600 text-white" : "bg-gray-100"}`}
          onClick={() => setMode("signin")}
        >
          Sign in
        </button>
      </div>
      <form onSubmit={submit} className="grid gap-3">
        <label className="grid gap-1">
          <span className="text-sm">Email</span>
          <input className="border rounded-xl px-3 py-2" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="grid gap-1">
          <span className="text-sm">Password</span>
          <input className="border rounded-xl px-3 py-2" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {err && <div className="text-red-600 text-sm">{err}</div>}
        <button className="mt-1 bg-indigo-600 text-white rounded-xl px-4 py-2">{mode === "signup" ? "Create account" : "Sign in"}</button>
      </form>
    </div>
  );
}

// ------------------- Dashboard -------------------
function Dashboard({ store, setStore, currentUser, goto }: { store: Store; setStore: SetStore; currentUser: User; goto: (route: string) => void }) {
  const surveys = Object.values(store.surveys).sort((a, b) => b.createdAt - a.createdAt);
  const myTaken = currentUser.taken || {};

  const available = surveys.filter((s) => !myTaken[s.id]);
  const completed = surveys.filter((s) => !!myTaken[s.id]);

  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 grid gap-4">
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Available Surveys</h2>
            <span className="text-sm text-gray-500">{available.length} open</span>
          </div>
          <div className="grid gap-3">
            {available.length === 0 && <Empty title="No surveys right now" subtitle="Check back later." />}
            {available.map((s) => (
              <SurveyRow key={s.id} s={s} action={() => goto(`/take/${s.id}`)} label="Take" />
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold mb-3">Completed</h2>
          <div className="grid gap-3">
            {completed.length === 0 && <Empty title="Nothing completed yet" subtitle="Finish your first survey to earn." />}
            {completed.map((s) => (
              <SurveyRow key={s.id} s={s} label="Done" />
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-4">
        <Wallet currentUser={currentUser} />
        {currentUser.isAdmin && (
          <Card>
            <h3 className="font-semibold mb-2">Admin</h3>
            <p className="text-sm text-gray-600 mb-3">Create and publish surveys. You are an admin because you were the first to register.</p>
            <button className="bg-indigo-600 text-white rounded-xl px-4 py-2" onClick={() => goto("/create")}>
              New Survey
            </button>
          </Card>
        )}
      </div>
    </div>
  );
}

function Wallet({ currentUser }: { currentUser: User }) {
  const balance = (currentUser.balance || 0).toFixed(2);
  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-600">Balance</div>
          <div className="text-2xl font-bold">${balance}</div>
        </div>
        <button className="px-4 py-2 rounded-xl bg-gray-100">Withdraw (demo)</button>
      </div>
    </Card>
  );
}

function SurveyRow({ s, action, label }: { s: Survey; action?: () => void; label: string }) {
  return (
    <div className="p-3 border rounded-xl flex items-center justify-between">
      <div>
        <div className="font-medium">{s.title}</div>
        <div className="text-xs text-gray-500">Reward: ${s.reward.toFixed(2)} · {s.questions.length} question(s)</div>
      </div>
      {action ? (
        <button onClick={action} className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-sm">{label}</button>
      ) : (
        <span className="text-sm text-gray-400">{label}</span>
      )}
    </div>
  );
}

function Empty({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="p-8 text-center border rounded-xl">
      <div className="font-medium mb-1">{title}</div>
      {subtitle && <div className="text-sm text-gray-500">{subtitle}</div>}
    </div>
  );
}

// ------------------- Create Survey -------------------
function CreateSurvey({ store, setStore, onBack, currentUser }: { store: Store; setStore: SetStore; onBack: () => void; currentUser: User }) {
  const [title, setTitle] = useState("");
  const [reward, setReward] = useState(1);
  const [qs, setQs] = useState<QuestionDraft[]>([]);

  function addQuestion(type: QuestionType) {
    setQs((q) => [
      ...q,
      { id: rid(), type, prompt: "", options: type === "mc" ? ["Option A", "Option B"] : undefined },
    ]);
  }

  function publish() {
    if (!title || qs.length === 0) return alert("Add a title and at least one question");
    const survey: Survey = {
      id: rid(),
      title,
      reward: Number(reward) || 0,
      questions: qs.map((q, i) => ({ id: q.id, type: q.type, prompt: q.prompt || `Question ${i + 1}`, options: q.options })),
      createdAt: Date.now(),
      creatorUid: currentUser.uid,
    };
    setStore((s) => ({ ...s, surveys: { ...s.surveys, [survey.id]: survey } }));
    onBack();
  }

  return (
    <div className="max-w-3xl mx-auto">
      <button onClick={onBack} className="text-sm text-gray-600 mb-3">← Back</button>
      <Card>
        <h2 className="text-lg font-semibold mb-3">New Survey</h2>
        <div className="grid gap-3">
          <label className="grid gap-1">
            <span className="text-sm">Title</span>
            <input className="border rounded-xl px-3 py-2" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Customer Satisfaction – July" />
          </label>
          <label className="grid gap-1 max-w-xs">
            <span className="text-sm">Reward (USD)</span>
            <input className="border rounded-xl px-3 py-2" type="number" step="0.01" value={reward} onChange={(e) => setReward(parseFloat(e.target.value))} />
          </label>

          <div className="grid gap-2">
            <div className="flex gap-2">
              <button className="px-3 py-1.5 rounded-xl bg-gray-100" onClick={() => addQuestion("mc")}>+ Multiple choice</button>
              <button className="px-3 py-1.5 rounded-xl bg-gray-100" onClick={() => addQuestion("text")}>+ Short text</button>
            </div>
            {qs.length === 0 && <div className="text-sm text-gray-500">Add your first question</div>}
            {qs.map((q, idx) => (
              <div key={q.id} className="p-3 border rounded-xl">
                <div className="text-sm text-gray-500 mb-1">Question {idx + 1}</div>
                <input
                  className="border rounded-xl px-3 py-2 w-full mb-2"
                  value={q.prompt}
                  onChange={(e) => setQs((old) => old.map((it) => (it.id === q.id ? { ...it, prompt: e.target.value } : it)))}
                  placeholder={q.type === "mc" ? "e.g., Which feature do you like?" : "e.g., Any suggestions?"}
                />
                {q.type === "mc" && (
                  <div className="grid gap-2">
                    {(q.options || []).map((op, i) => (
                      <input
                        key={i}
                        className="border rounded-xl px-3 py-2"
                        value={op}
                        onChange={(e) => setQs((old) => old.map((it) => it.id === q.id ? { ...it, options: (it.options || []).map((oo, ii) => ii === i ? e.target.value : oo) } : it))}
                      />)
                    )}
                    <button className="text-sm text-indigo-600 text-left" onClick={() => setQs((old) => old.map((it) => it.id === q.id ? { ...it, options: [...(it.options || []), `Option ${(it.options || []).length + 1}`] } : it))}>
                      + Add option
                    </button>
                  </div>
                )}
                <div className="mt-2 flex gap-2">
                  <button className="px-3 py-1.5 rounded-xl bg-gray-100" onClick={() => setQs((old) => old.filter((it) => it.id !== q.id))}>Delete</button>
                  <span className="text-xs text-gray-500 self-center">Type: {q.type === "mc" ? "Multiple choice" : "Short text"}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button className="bg-indigo-600 text-white rounded-xl px-4 py-2" onClick={publish}>Publish survey</button>
            <span className="text-xs text-gray-500">You can edit code to add quotas/targets later.</span>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ------------------- Take Survey -------------------
function TakeSurvey({ store, setStore, onBack, surveyId, currentUser }: { store: Store; setStore: SetStore; onBack: () => void; surveyId: string; currentUser: User }) {
  const survey = store.surveys[surveyId];
  const [answers, setAnswers] = useState<Record<string, string>>({});

  if (!survey) return (
    <div className="max-w-2xl mx-auto">
      <button onClick={onBack} className="text-sm text-gray-600 mb-3">← Back</button>
      <Card>
        <div>Survey not found.</div>
      </Card>
    </div>
  );

  function submit() {
    for (const q of survey.questions) {
      if (!answers[q.id] || answers[q.id].trim() === "") return alert("Please answer all questions");
    }
    setStore((s) => {
      const users = { ...s.users };
      const u = { ...users[currentUser.uid] };
      if (u.taken[survey.id]) return s; // already taken
      u.taken = { ...u.taken, [survey.id]: true };
      u.balance = (u.balance || 0) + survey.reward;
      users[u.uid] = u;
      const responses = { ...s.responses };
      const resp: Response = { id: rid(), surveyId: survey.id, uid: u.uid, createdAt: Date.now(), answers };
      responses[resp.id] = resp;
      return { ...s, users, responses };
    });
    onBack();
    alert(`Thanks! You earned $${survey.reward.toFixed(2)}`);
  }

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={onBack} className="text-sm text-gray-600 mb-3">← Back</button>
      <Card>
        <div className="mb-2 text-xs text-gray-500">Reward: ${survey.reward.toFixed(2)}</div>
        <h2 className="text-xl font-semibold mb-4">{survey.title}</h2>
        <div className="grid gap-4">
          {survey.questions.map((q, i) => (
            <div key={q.id}>
              <div className="mb-2 font-medium">{i + 1}. {q.prompt}</div>
              {q.type === "mc" ? (
                <div className="grid gap-2">
                  {(q.options || []).map((op, idx) => (
                    <label key={idx} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={q.id}
                        value={op}
                        onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                      />
                      <span>{op}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <input
                  className="border rounded-xl px-3 py-2 w-full"
                  value={answers[q.id] || ""}
                  onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                  placeholder="Type your answer"
                />
              )}
            </div>
          ))}
          <button className="bg-indigo-600 text-white rounded-xl px-4 py-2" onClick={submit}>Submit</button>
        </div>
      </Card>
    </div>
  );
}

// ------------------- UI helpers -------------------
function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-white rounded-2xl shadow p-4">{children}</div>;
}

// ------------------- Storage layer -------------------
const StoreKey = "scorpio:v1";

function useLocalStorage() {
  const [state, setState] = useState<Store>(() => {
    const raw = localStorage.getItem(StoreKey);
    if (raw) return JSON.parse(raw);
    return { users: {}, surveys: {}, responses: {}, session: null } as Store;
  });

  useEffect(() => {
    localStorage.setItem(StoreKey, JSON.stringify(state));
  }, [state]);

  // expose a setState-like API to children via context-ish helper
  (window as any).__setScorpioStore = setState;

  return [state, setState] as const;
}

function useLocalStorageCtx() {
  const setStore = (updater: SetStore | ((s: Store) => Store)) => {
    if (typeof updater === "function") {
      (window as any).__setScorpioStore((updater as any));
    } else {
      (window as any).__setScorpioStore(updater);
    }
  };
  return { setStore } as { setStore: SetStore };
}

// ------------------- Types -------------------

type QuestionType = "mc" | "text";

type Question = {
  id: string;
  type: QuestionType;
  prompt: string;
  options?: string[];
};

type QuestionDraft = {
  id: string;
  type: QuestionType;
  prompt: string;
  options?: string[];
};

type Survey = {
  id: string;
  title: string;
  reward: number;
  questions: Question[];
  createdAt: number;
  creatorUid: string;
};

type Response = {
  id: string;
  surveyId: string;
  uid: string;
  createdAt: number;
  answers: Record<string, string>;
};

type User = {
  uid: string;
  email: string;
  passwordHash: string;
  balance: number;
  isAdmin?: boolean;
  taken: Record<string, boolean>;
};

type Store = {
  users: Record<string, User>;
  surveys: Record<string, Survey>;
  responses: Record<string, Response>;
  session: { uid: string } | null;
};

type SetStore = (updater: ((s: Store) => Store) | Store) => void;

// ------------------- Utils -------------------
function rid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return String(h >>> 0);
}
 

