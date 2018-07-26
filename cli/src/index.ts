import { CLI, Shim, isPrintable } from "clime";
import path from "path";

const root = path.resolve(`${__dirname}/../..`);

export async function run() {
  const cli = new CLI("towercg2", `${__dirname}/commands`);
  const shim = new Shim(cli);


  try {
    const result = await cli.execute(process.argv.slice(2), root);

    if (isPrintable(result)) {
      await result.print(process.stdout, process.stderr);
    } else if (result !== undefined) {
      console.log(result);
    }
  } catch (error) {
    if (isPrintable(error)) {
      await error.print(process.stdout, process.stderr);
    }

    process.exit(1);
  }
}
