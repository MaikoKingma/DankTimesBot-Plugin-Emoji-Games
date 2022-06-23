import { assert } from "chai";
import { User } from "../../src/chat/user/user";
import { Game } from "./games";
import { DiceMock, MessageMock } from "./message-mock";

describe("Game", () => {

    it("Can play game", () => {
        const game = new Game("Penalties", "⚽️", 5);
        const user1 = new User(1, "user1");
        const user2 = new User(2, "user2");
        game.AddPlayer(user1);
        game.AddPlayer(user2);
        const failedMsg = new MessageMock();
        failedMsg.dice = new DiceMock();
        failedMsg.dice.emoji = "⚽️";
        failedMsg.dice.value = 1;
        const successMsg = new MessageMock();
        successMsg.dice = new DiceMock();
        successMsg.dice.emoji = "⚽️";
        successMsg.dice.value = 4;
        game.HandleMessage(failedMsg, user1);
        game.HandleMessage(failedMsg, user2);
        assert.equal(game.round, 1);
        game.HandleMessage(successMsg, user1);
        game.HandleMessage(failedMsg, user2);
        assert.equal(game.round, 2);
        game.HandleMessage(failedMsg, user1);
        game.HandleMessage(successMsg, user2);
        assert.equal(game.round, 3);
        game.HandleMessage(successMsg, user1);
        game.HandleMessage(successMsg, user2);
        assert.equal(game.round, 4);
        game.HandleMessage(failedMsg, user1);
        game.HandleMessage(successMsg, user2);
        assert.equal(game.round, 5);
    });
});