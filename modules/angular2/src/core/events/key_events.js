import {DOM} from 'angular2/src/dom/dom_adapter';
import {isPresent, isBlank, StringWrapper, RegExpWrapper, BaseException, NumberWrapper} from 'angular2/src/facade/lang';
import {StringMapWrapper, ListWrapper} from 'angular2/src/facade/collection';
import {EventManagerPlugin} from './event_manager';

const DOM_KEY_LOCATION_NUMPAD = 3;

var modifierKeys = ['alt', 'control', 'meta', 'shift'];
var modifierKeyGetters = {
  'alt': (event) => event.altKey,
  'control': (event) => event.ctrlKey,
  'meta': (event) => event.metaKey,
  'shift': (event) => event.shiftKey
}

// Map to convert some key or keyIdentifier values to what will be returned by getEventKey
var keyMap = {
  ' ': 'space', // for readability
  '.': 'dot', // because '.' is used as a separator in event names

  // The following values are here for cross-browser compatibility and to match the W3C standard
  // cf http://www.w3.org/TR/DOM-Level-3-Events-key/
  '\b': 'backspace',
  '\t': 'tab',
  '\x7F': 'delete',
  '\x1B': 'escape',
  'del': 'delete',
  'esc': 'escape',
  'left': 'arrowleft',
  'right': 'arrowright',
  'up': 'arrowup',
  'down':'arrowdown',
  'menu': 'contextmenu',
  'scroll' : 'scrolllock',
  'win': 'os'
};

// There is a bug in Chrome for numeric keypad keys:
// https://code.google.com/p/chromium/issues/detail?id=155654
// 1, 2, 3 ... are reported as A, B, C ...
var chromeNumKeyPadMap = {
  'A': '1',
  'B': '2',
  'C': '3',
  'D': '4',
  'E': '5',
  'F': '6',
  'G': '7',
  'H': '8',
  'I': '9',
  'J': '*',
  'K': '+',
  'M': '-',
  'N': '.',
  'O': '/',
  '\x60': '0',
  '\x90': 'numlock'
};

export class KeyEventsPlugin extends EventManagerPlugin {
  constructor() {
    super();
  }

  supports(eventName: string): boolean {
    return isPresent(KeyEventsPlugin.parseEventName(eventName));
  }

  addEventListener(element, eventName: string, handler: Function,
      shouldSupportBubble: boolean) {
    var parsedEvent = KeyEventsPlugin.parseEventName(eventName);

    var outsideHandler = KeyEventsPlugin.eventCallback(element, shouldSupportBubble,
      parsedEvent.fullKey, handler, this.manager.getZone());

    this.manager.getZone().runOutsideAngular(() => {
      DOM.on(element, parsedEvent.domEventName, outsideHandler);
    });
  }

  static parseEventName(eventName: string) {
    eventName = eventName.toLowerCase();
    var parts = eventName.split('.');
    var domEventName = ListWrapper.removeAt(parts, 0);
    if ((parts.length === 0) || (domEventName !== 'keydown' && domEventName !== 'keyup')) {
      return null;
    }
    var key = ListWrapper.removeLast(parts);

    var fullKey = '';
    ListWrapper.forEach(modifierKeys, (modifierName) => {
      if (ListWrapper.contains(parts, modifierName)) {
        ListWrapper.remove(parts, modifierName);
        fullKey += modifierName + '.';
      }
    });
    fullKey += key;

    if (parts.length != 0 || key.length === 0) {
      // returning null instead of throwing to let another plugin process the event
      return null;
    }

    return {
      domEventName: domEventName,
      fullKey: fullKey
    };
  }

  static getEventKey(event): string {
    var key = event.key;
    if (isBlank(key)) {
      key = event.keyIdentifier;
      // keyIdentifier is defined in the old draft of DOM Level 3 Events implemented by Chrome and Safari
      // cf http://www.w3.org/TR/2007/WD-DOM-Level-3-Events-20071221/events.html#Events-KeyboardEvents-Interfaces
      if (isPresent(key) && StringWrapper.startsWith(key, 'U+')) {
        key = StringWrapper.fromCharCode(NumberWrapper.parseInt(StringWrapper.substring(key, 2), 16));
        if (event.location === DOM_KEY_LOCATION_NUMPAD && StringMapWrapper.contains(chromeNumKeyPadMap, key)) {
          // There is a bug in Chrome for numeric keypad keys:
          // https://code.google.com/p/chromium/issues/detail?id=155654
          // 1, 2, 3 ... are reported as A, B, C ...
          key = StringMapWrapper.get(chromeNumKeyPadMap, key);
        }
      }
      if (isBlank(key)) {
        key = 'Unidentified';
      }
    }

    key = key.toLowerCase();

    if (StringMapWrapper.contains(keyMap, key)) {
      key = StringMapWrapper.get(keyMap, key);
    }

    return key;
  }

  static getEventFullKey(event): string {
    var fullKey = '';
    var key = KeyEventsPlugin.getEventKey(event);
    ListWrapper.forEach(modifierKeys, (modifierName) => {
      if (modifierName != key) {
        var modifierGetter = StringMapWrapper.get(modifierKeyGetters, modifierName);
        if (modifierGetter(event)) {
          fullKey += modifierName + '.';
        }
      }
    });
    fullKey += key;
    return fullKey;
  }

  static eventCallback(element, shouldSupportBubble, fullKey, handler, zone) {
    return (event) => {
        var correctElement = shouldSupportBubble || event.target === element;
        if (correctElement && KeyEventsPlugin.getEventFullKey(event) === fullKey) {
          zone.run(() => handler(event));
        }
      };
  }
}
