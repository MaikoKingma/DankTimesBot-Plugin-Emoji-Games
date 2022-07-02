export class GameResponse {
    public Msg: string = "";
    public RoundEnded = false;
    public Delay: number = 0;
    public IsReply: boolean = false;
    public ValidInteraction: boolean = false;

    public static PlayerError(msg: string): GameResponse {
        const response = new GameResponse();
        response.Msg = msg;
        response.IsReply = true;
        return response;
    }

    public static RoundTransition(msg: string, delay: number = 5): GameResponse {
        const response = new GameResponse();
        response.Msg = msg;
        response.RoundEnded = true;
        response.ValidInteraction = true;
        response.Delay = delay;
        return response;
    }

    public static EmptyResponse(validInteraction: boolean): GameResponse {
        const response = new GameResponse();
        response.ValidInteraction = validInteraction;
        return response;
    }

    public static SlotMachineResponse(msg: string): GameResponse {
        const response = new GameResponse();
        response.Msg = msg;
        response.Delay = 3;
        response.IsReply = true;
        return response;
    }
}