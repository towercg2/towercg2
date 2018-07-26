import { Command, command, metadata, param } from "clime";

@command({
  description: "test command"
})
export default class Ping extends Command {
  @metadata
  execute() {
    console.log("Ping!");
  }
}
