import user from '../action/user';
import ui from '../action/pc';
import store from '../store';

// third party middleware
import plugin from '../middleware/plugin';

const thirdPartyMiddlewares = [
    plugin,
];

/**
 * native handle before middleware
 */
function addAdditionalFields(message) {
    message.notification = {
        title: `${message.from.username} - 发来消息:`,
        icon: /^http/.test(message.from.avatar) ? message.from.avatar : 'http://assets.suisuijiang.com/user_avatar_default.png',
        body: message.type === 'text' ? message.content : `[${message.type}]`,
        tag: message.from.id,
    };
    message.showNotification = true;
    message.playSound = true;
    message.preview = message.type === 'text' ? `${message.from.username}: ${message.content}` : `${message.from.username}: [${message.type}]`;
    message.isNew = true;
    return message;
}
const beforeMiddleWareHandles = [
    addAdditionalFields,
];

/**
 * native handle after middleware
 */
function playSound(message) {
    if (message.playSound && !message.isSelf) {
        ui.playSound(true);
    }

    delete message.playSound;
    return message;
}
function openNotification(message) {
    const state = store.getState();
    if (message.showNotification && !message.isSelf && window.Notification && window.Notification.permission === 'granted' && !state.getIn(['pc', 'windowFocus']) && state.getIn(['pc', 'desktopNotification'])) {
        const notification = new window.Notification(
            message.notification.title,
            {
                icon: message.notification.avatar,
                body: message.notification.body,
                tag: message.notification.tag,
            }
        );
        notification.onclick = function () {
            window.blur();
            window.focus();
            this.close();
        };
        // auto close
        setTimeout(notification.close.bind(notification), 3000);
    }

    delete message.notification;
    delete message.showNotification;
    return message;
}
const afterMiddleWareHandles = [
    playSound,
    openNotification,
];


function applyMiddleWares(message, middlewares) {
    for (const middleware of middlewares) {
        message = middleware(message);
    }
    return message;
}
function messageHandle(message) {
    message = applyMiddleWares(message, beforeMiddleWareHandles);
    message = applyMiddleWares(message, thirdPartyMiddlewares);
    message = applyMiddleWares(message, afterMiddleWareHandles);

    if (message.isSelf) {
        return user.addSelfMessage(message);
    }
    if (message.linkmanType === 'group') {
        user.addGroupMessage(message);
    }
    else if (message.linkmanType === 'stranger') {
        user.addMessage(message);
    }
}

function initialMessagesHandle(messages) {
    return messages.map(m => {
        m.isNew = false;
        return applyMiddleWares(m, thirdPartyMiddlewares);
    });
}

export default { messageHandle, initialMessagesHandle };
