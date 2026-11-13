/**
 * 运动记录文本解析与格式化。
 *
 * 手动健身房表单写入固定格式「动作 · N组×M次 · Xkg · 备注」，
 * AI 智能添加返回的备注格式不固定（分隔符、顺序、单位都可能不同），
 * 这里统一容错解析，供事件展示、编辑回填和 AI 入库前规范化复用。
 */

const FULL_WIDTH_OFFSET = 0xfee0;

// 兼容「4组×10次」「4组，每组10次」「4组 10次」以及健身房常用的「4x10」简写
const SETS_REPS_PATTERNS = [
	/(\d+)\s*组[\s·,，、:：]*(?:每组[\s·,，、:：]*)?[×xX*✕]?[\s·,，、:：]*(\d+)\s*次/,
	/(\d+)\s*[×xX*✕]\s*(\d+)\s*次?/,
];

const WEIGHT_UNIT_PATTERN = /(\d+(?:\.\d+)?)\s*(?:kg|公斤|千克)/i;
const WEIGHT_LABEL_PATTERN =
	/重量\s*[:：]?\s*(\d+(?:\.\d+)?)\s*(?:kg|公斤|千克)?/i;
const SEGMENT_SPLIT_PATTERN = /[\s·,，、;；:：/|]+/;

function normalizeText(raw) {
	return String(raw || "")
		.replace(/[\uff01-\uff5e]/g, (ch) =>
			String.fromCharCode(ch.charCodeAt(0) - FULL_WIDTH_OFFSET),
		)
		.replace(/\u3000/g, " ")
		.replace(/[\r\n]+/g, " ")
		.trim();
}

function matchRange(match) {
	return { start: match.index, end: match.index + match[0].length };
}

function stripRanges(text, ranges) {
	if (!ranges.length) return text;
	let result = "";
	let cursor = 0;
	[...ranges]
		.sort((a, b) => a.start - b.start)
		.forEach(({ start, end }) => {
			if (start < cursor) return;
			result += text.slice(cursor, start);
			cursor = end;
		});
	return result + text.slice(cursor);
}

/**
 * 解析运动备注。
 * @returns {null | {action: string, sets: string, reps: string, weight: string, note: string, hasMetrics: boolean}}
 * 识别不到组次和重量时，整段文本作为 action 返回（兼容历史自由文本）。
 */
export function parseExerciseTitle(rawTitle) {
	const text = normalizeText(rawTitle);
	// 标题只是事件类型名时说明原记录没有备注
	if (!text || text === "运动") return null;

	const ranges = [];
	let weight = "";

	const weightMatch =
		text.match(WEIGHT_UNIT_PATTERN) || text.match(WEIGHT_LABEL_PATTERN);
	if (weightMatch) {
		weight = weightMatch[1];
		ranges.push(matchRange(weightMatch));
	}

	let sets = "";
	let reps = "";
	let setsRepsMatch = null;
	for (const pattern of SETS_REPS_PATTERNS) {
		setsRepsMatch = text.match(pattern);
		if (setsRepsMatch) break;
	}
	if (setsRepsMatch) {
		sets = setsRepsMatch[1];
		reps = setsRepsMatch[2];
		ranges.push(matchRange(setsRepsMatch));
	} else {
		// 「4组，10次」这类拆开写的形式
		const setsMatch = text.match(/(\d+)\s*组/);
		const repsMatch = text.match(/(\d+)\s*次/);
		if (setsMatch && repsMatch) {
			sets = setsMatch[1];
			reps = repsMatch[1];
			ranges.push(matchRange(setsMatch), matchRange(repsMatch));
		}
	}

	const hasMetrics = Boolean(sets && reps);
	if (!hasMetrics && !weight) {
		return {
			action: text,
			sets: "",
			reps: "",
			weight: "",
			note: "",
			hasMetrics: false,
		};
	}

	const segments = stripRanges(text, ranges)
		.split(SEGMENT_SPLIT_PATTERN)
		.map((segment) => segment.trim())
		.filter((segment) => segment && segment !== "运动");

	return {
		action: segments[0] || "",
		sets: hasMetrics ? sets : "",
		reps: hasMetrics ? reps : "",
		weight,
		note: segments.slice(1).join(" · "),
		hasMetrics,
	};
}

/** 把解析结果拼回统一格式：动作 · N组×M次 · Xkg · 备注 */
export function formatExerciseTitle({ action, sets, reps, weight, note }) {
	const parts = [];
	if (action) parts.push(action);
	if (sets && reps) parts.push(`${sets}组×${reps}次`);
	if (weight) {
		const numericWeight = Number(weight);
		parts.push(`${Number.isFinite(numericWeight) ? numericWeight : weight}kg`);
	}
	if (note) parts.push(note);
	return parts.join(" · ");
}

/** AI 运动备注入库前规范化；识别不到组次时原样保留，避免破坏自由文本 */
export function normalizeExerciseRemark(rawRemark) {
	const parsed = parseExerciseTitle(rawRemark);
	if (!parsed) return normalizeText(rawRemark);
	if (!parsed.hasMetrics || !parsed.action) return normalizeText(rawRemark);
	return formatExerciseTitle(parsed);
}
