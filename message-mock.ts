import TelegramBot from "node-telegram-bot-api";

export class MessageMock implements TelegramBot.Message {
    message_id: number;
    from?: TelegramBot.User | undefined;
    date: number;
    chat: TelegramBot.Chat;
    sender_chat?: TelegramBot.Chat | undefined;
    forward_from?: TelegramBot.User | undefined;
    forward_from_chat?: TelegramBot.Chat | undefined;
    forward_from_message_id?: number | undefined;
    forward_signature?: string | undefined;
    forward_sender_name?: string | undefined;
    forward_date?: number | undefined;
    reply_to_message?: TelegramBot.Message | undefined;
    edit_date?: number | undefined;
    media_group_id?: string | undefined;
    author_signature?: string | undefined;
    text?: string | undefined;
    entities?: TelegramBot.MessageEntity[] | undefined;
    caption_entities?: TelegramBot.MessageEntity[] | undefined;
    audio?: TelegramBot.Audio | undefined;
    document?: TelegramBot.Document | undefined;
    animation?: TelegramBot.Animation | undefined;
    game?: TelegramBot.Game | undefined;
    photo?: TelegramBot.PhotoSize[] | undefined;
    sticker?: TelegramBot.Sticker | undefined;
    video?: TelegramBot.Video | undefined;
    voice?: TelegramBot.Voice | undefined;
    video_note?: TelegramBot.VideoNote | undefined;
    caption?: string | undefined;
    contact?: TelegramBot.Contact | undefined;
    location?: TelegramBot.Location | undefined;
    venue?: TelegramBot.Venue | undefined;
    poll?: TelegramBot.Poll | undefined;
    new_chat_members?: TelegramBot.User[] | undefined;
    left_chat_member?: TelegramBot.User | undefined;
    new_chat_title?: string | undefined;
    new_chat_photo?: TelegramBot.PhotoSize[] | undefined;
    delete_chat_photo?: boolean | undefined;
    group_chat_created?: boolean | undefined;
    supergroup_chat_created?: boolean | undefined;
    channel_chat_created?: boolean | undefined;
    migrate_to_chat_id?: number | undefined;
    migrate_from_chat_id?: number | undefined;
    pinned_message?: TelegramBot.Message | undefined;
    invoice?: TelegramBot.Invoice | undefined;
    successful_payment?: TelegramBot.SuccessfulPayment | undefined;
    connected_website?: string | undefined;
    passport_data?: TelegramBot.PassportData | undefined;
    reply_markup?: TelegramBot.InlineKeyboardMarkup | undefined;
    is_automatic_forward?: boolean | undefined;
    has_protected_content?: boolean | undefined;
    dice?: DiceMock | undefined;
}

export class DiceMock implements TelegramBot.Dice {
    emoji: string;
    value: number;
}
