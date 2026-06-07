export interface ConceptGroup {
  label: string;
  cls: string; // Tailwind classes for badge styling (light + dark)
  concepts: string[];
}

// Same keyword routing as the backend _categorise_concept function
function getGroup(concept: string): string {
  const low = concept.toLowerCase();

  if (/mechanistic.?interp|interpretab|circuits|superposition|sparse.?autoencoder|activation.?patch|probing|feature.?visual|red.?team|jailbreak|adversarial|constitutional|scalable.?oversight|debate|amplification|anomaly.?detect|robustness|safety|alignment.?eval/.test(low))
    return "AI Safety & Interpretability";

  if (/rlhf|rlaif|dpo|ppo|grpo|reward.?model|preference|reinforcement.?learning.?from|supervised.?fine.?tun|instruction.?tun/.test(low))
    return "Alignment & Training";

  if (/transformer|diffusion|convolution|cnn|rnn|lstm|gru|self.?attention|attention|moe|mixture.?of.?expert|ssm|mamba|state.?space|bert|gpt|vit|resnet|gan|vae|flow.?matching|encoder|decoder|unet/.test(low))
    return "Architectures";

  if (/quantization|pruning|distillation|lora|peft|qlora|fine.?tun|adapter|prefix.?tun|flash.?attention|gradient.?checkpoint|mixed.?precision|fp16|bf16|int8/.test(low))
    return "Optimization & Fine-tuning";

  if (/kv.?cache|speculative.?decod|continuous.?batch|tensor.?parallel|pipeline.?parallel|vllm|tensorrt|onnx|inference.?optim|latency|throughput|serving|deployment|model.?compress/.test(low))
    return "Inference & Serving";

  if (/scaling.?law|chinchilla|pretraining|pre.?training|data.?curation|synthetic.?data|curriculum|ablation|benchmark|evaluation|evals|mmlu|humaneval|emergent|capability|elicitation/.test(low))
    return "Scaling & Evals";

  if (/distributed.?train|data.?parallel|model.?parallel|fsdp|deepspeed|megatron|gpu.?cluster|cuda|triton.?kernel|hpc|slurm|multi.?node|interconnect|nvlink/.test(low))
    return "Distributed Systems";

  if (/information.?theory|bayesian|probability|statistics|linear.?algebra|optimization.?theory|measure.?theory|stochastic|variational|entropy|kl.?divergence/.test(low))
    return "Math & Theory";

  return "Other Concepts";
}

export const GROUP_STYLES: Record<string, string> = {
  "ML Frameworks":              "border-violet-300 text-violet-700 bg-violet-50 dark:border-violet-700 dark:text-violet-300 dark:bg-violet-900/20",
  "Architectures":              "border-blue-300 text-blue-700 bg-blue-50 dark:border-blue-700 dark:text-blue-300 dark:bg-blue-900/20",
  "AI Safety & Interpretability":"border-rose-300 text-rose-700 bg-rose-50 dark:border-rose-700 dark:text-rose-300 dark:bg-rose-900/20",
  "Alignment & Training":       "border-pink-300 text-pink-700 bg-pink-50 dark:border-pink-700 dark:text-pink-300 dark:bg-pink-900/20",
  "Optimization & Fine-tuning": "border-amber-300 text-amber-700 bg-amber-50 dark:border-yellow-700 dark:text-yellow-300 dark:bg-yellow-900/20",
  "Inference & Serving":        "border-orange-300 text-orange-700 bg-orange-50 dark:border-orange-700 dark:text-orange-300 dark:bg-orange-900/20",
  "Scaling & Evals":            "border-cyan-300 text-cyan-700 bg-cyan-50 dark:border-cyan-700 dark:text-cyan-300 dark:bg-cyan-900/20",
  "Distributed Systems":        "border-red-300 text-red-700 bg-red-50 dark:border-red-700 dark:text-red-300 dark:bg-red-900/20",
  "Infrastructure & MLOps":     "border-green-300 text-green-700 bg-green-50 dark:border-green-700 dark:text-green-300 dark:bg-green-900/20",
  "Data & Pipeline":            "border-teal-300 text-teal-700 bg-teal-50 dark:border-teal-700 dark:text-teal-300 dark:bg-teal-900/20",
  "Languages":                  "border-slate-300 text-slate-700 bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:bg-slate-800/30",
  "Experiment & Tooling":       "border-indigo-300 text-indigo-700 bg-indigo-50 dark:border-indigo-700 dark:text-indigo-300 dark:bg-indigo-900/20",
  "Math & Theory":              "border-purple-300 text-purple-700 bg-purple-50 dark:border-purple-700 dark:text-purple-300 dark:bg-purple-900/20",
  "Other Concepts":             "border-zinc-300 text-zinc-600 bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:bg-zinc-800/20",
};

const DEFAULT_STYLE = GROUP_STYLES["Other Concepts"];

export function groupConcepts(concepts: string[]): ConceptGroup[] {
  const map: Record<string, string[]> = {};

  for (const c of concepts) {
    const group = getGroup(c);
    if (!map[group]) map[group] = [];
    map[group].push(c);
  }

  const ORDER = [
    "Architectures",
    "AI Safety & Interpretability",
    "Alignment & Training",
    "Optimization & Fine-tuning",
    "Inference & Serving",
    "Scaling & Evals",
    "Distributed Systems",
    "Math & Theory",
    "Other Concepts",
  ];

  return [
    ...ORDER.filter((g) => map[g]).map((g) => ({ label: g, cls: GROUP_STYLES[g] ?? DEFAULT_STYLE, concepts: map[g] })),
    ...Object.keys(map).filter((g) => !ORDER.includes(g)).map((g) => ({ label: g, cls: GROUP_STYLES[g] ?? DEFAULT_STYLE, concepts: map[g] })),
  ];
}
