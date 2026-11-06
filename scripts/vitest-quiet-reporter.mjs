/**
 * vitest-quiet-reporter.mjs — Vitest 4 非 TTY 环境下的静默 reporter。
 *
 * 背景：vitest 在非 TTY（管道 / CI / 自动化）下仍会逐模块、逐用例打印通过
 * 列表，全量测试输出会完整进入调用方上下文，是长任务 token 消耗的来源之一。
 *
 * 行为：
 * - TTY（交互终端）：完整委托 DefaultReporter，交互体验不变。
 * - 非 TTY：不打印通过列表，不打印测试内 console；
 *   成功只输出一行提示 + 官方汇总行；失败由 reportSummary 输出失败详情。
 *
 * 用法：在 vitest.config.ts 中 `reporters: [new QuietReporter()]`。
 * 调用方可用 `--reporter=default|verbose` 覆盖回完整输出。
 */
import { DefaultReporter } from "vitest/node";

export class QuietReporter extends DefaultReporter {
  printTestModule() {
    if (this.isTTY) super.printTestModule(...arguments);
  }

  onTestModuleEnd(module) {
    if (this.isTTY) super.onTestModuleEnd(module);
  }

  onTestCaseResult(test) {
    if (this.isTTY) super.onTestCaseResult(test);
  }

  onUserConsoleLog(log, taskState) {
    if (this.isTTY) super.onUserConsoleLog(log, taskState);
  }

  onTestRunEnd(testModules, unhandledErrors, reason) {
    if (this.isTTY) {
      return super.onTestRunEnd(testModules, unhandledErrors, reason);
    }

    this.end = performance.now();
    const files = (testModules ?? []).map((module) => module.task);
    const errors = [...(unhandledErrors ?? [])];
    const anyFailed =
      errors.length > 0 || files.some((file) => file.result?.state === "fail");

    if (!anyFailed) {
      this.log("✓ 全部测试通过（详细列表已省略，npm run test:verbose 查看完整进度）");
    }
    super.reportSummary(files, errors);
  }
}
