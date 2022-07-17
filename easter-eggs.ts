import { Message } from "node-telegram-bot-api";
import { ChatMessageEventArguments } from "../../src/plugin-host/plugin-events/event-arguments/chat-message-event-arguments";
import { Emoji } from "./games/emoji";

type EasterEggSequence = {
    Trigger: string;
    Messages: Record<string, { message: string, emoji: string}>;
}

export class EasterEggs {

    private processingEasterEgg: boolean = false;

    private readonly easterEggs: EasterEggSequence[] = [
        {
            Trigger: Emoji.FootballEmoji,
            Messages: {
                1: { message: "...trips and shoots far over the goal", emoji: "😔" },
                2: { message: "A fast but barely aimed shot against the goalpost", emoji: "😔" },
                3: { message: "Luckily the keeper is holiday because this shot just goes straight in the center", emoji: "😒" },
                4: { message: "And what a sharp shot it is, nicely scored via the left goalpost", emoji: "😃" },
                5: { message: "And it's a perfect shot in the top right corner, amazing performance", emoji: "🎉" }
            }
        },
        {
            Trigger: Emoji.BasketballEmoji,
            Messages: {
                1: { message: "Like a child that has never seen a ball before, we're not sure what this player is doing here", emoji: "😔" },
                2: { message: "And it's a near miss after rolling off the wrong side of the hoop", emoji: "😞" },
                3: { message: "And off course somebody had to get ball stuck, thank you ver much", emoji: "😠" },
                4: { message: "What a shot, almost perfect", emoji: "😃" },
                5: { message: "Perfectly in the net not even touching the ring", emoji: "🎊" }
            }
        }
    ];

    private readonly rockPaperScissors: string[] = [ "👊", "✋", "✌️" ];
    private readonly emojiResponses: Record<string, string> = {
        "🇺🇦": "🇺🇦 Slava Ukraini!! 🇺🇦",
        "👊": this.rockPaperScissors[Math.floor(Math.random() * this.rockPaperScissors.length)],
        "✋": this.rockPaperScissors[Math.floor(Math.random() * this.rockPaperScissors.length)],
        "✌": this.rockPaperScissors[Math.floor(Math.random() * this.rockPaperScissors.length)]
    }

    constructor (private readonly sendMessage: (chatId: number, htmlMessage: string, replyToMessageId?: number, forceReply?: boolean, disableWebPagePreview?: boolean) => Promise<void | Message>
        ) {}

    public HandleEasterEggMessage(data: ChatMessageEventArguments): boolean {
        if (this.processingEasterEgg) {
            return false;
        }
        if (data.msg.dice)  {
            const easterEgg = this.easterEggs.find(easterEgg => easterEgg.Trigger === data.msg.dice!.emoji);
            if (easterEgg) {
                this.ProcessEasterEgg(data.chat.id, data.user.name, data.msg.dice.value, easterEgg);
                return true;
            }
        }
        if (data.msg.text) {
            const msg = this.emojiResponses[data.msg.text];
            if (msg) {
                this.sendMessage(data.chat.id, msg);
                this.ResetTimer();
                return true;
            }
        }
        return false;
    }

    private async ProcessEasterEgg(chatId: number, username: string, input: number, easterEgg: EasterEggSequence) {
        this.processingEasterEgg = true;
        setTimeout(() => {
            this.sendMessage(chatId, `@${username} Steps forward to take a shot ${easterEgg.Trigger}`);
            setTimeout(() => {
                this.sendMessage(chatId, "They shoot");
                setTimeout(() => {
                    this.sendMessage(chatId, easterEgg.Messages[input].message);
                    setTimeout(() => {
                            this.sendMessage(chatId, easterEgg.Messages[input].emoji);
                    }, 50);
                    this.ResetTimer();
                }, 2 * 1000);
            }, 1 * 1000);
        }, 1 * 1000);
    }

    private ResetTimer() {
        setTimeout(() => {
            this.processingEasterEgg = false;
        }, 10 * 1000);
    }
}
