import Capacitor
import UIKit
import UserNotifications

@objc(AppBadgePlugin)
public class AppBadgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AppBadgePlugin"
    public let jsName = "AppBadge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "set", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clear", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancelReminders", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "scheduleReminders", returnType: CAPPluginReturnPromise)
    ]

    private let reminderPrefix = "studenthub.reminder."

    @objc func set(_ call: CAPPluginCall) {
        let count = call.getInt("count", 0)
        let badgeCount = max(0, count)

        if #available(iOS 16.0, *) {
            UNUserNotificationCenter.current().setBadgeCount(badgeCount) { error in
                if let error = error {
                    call.reject(error.localizedDescription)
                    return
                }
                call.resolve()
            }
        } else {
            DispatchQueue.main.async {
                UIApplication.shared.applicationIconBadgeNumber = badgeCount
                call.resolve()
            }
        }
    }

    @objc func clear(_ call: CAPPluginCall) {
        if #available(iOS 16.0, *) {
            UNUserNotificationCenter.current().setBadgeCount(0) { error in
                if let error = error {
                    call.reject(error.localizedDescription)
                    return
                }
                call.resolve()
            }
        } else {
            DispatchQueue.main.async {
                UIApplication.shared.applicationIconBadgeNumber = 0
                call.resolve()
            }
        }
    }

    @objc func cancelReminders(_ call: CAPPluginCall) {
        let center = UNUserNotificationCenter.current()
        center.getPendingNotificationRequests { [reminderPrefix] requests in
            let pendingIdentifiers = requests
                .map { $0.identifier }
                .filter { $0.hasPrefix(reminderPrefix) }
            center.getDeliveredNotifications { notifications in
                let deliveredIdentifiers = notifications
                    .map { $0.request.identifier }
                    .filter { $0.hasPrefix(reminderPrefix) }
                center.removePendingNotificationRequests(withIdentifiers: pendingIdentifiers)
                center.removeDeliveredNotifications(withIdentifiers: deliveredIdentifiers)
                call.resolve()
            }
        }
    }

    @objc func scheduleReminders(_ call: CAPPluginCall) {
        guard let reminders = call.getArray("reminders", JSObject.self) else {
            call.reject("Missing reminders")
            return
        }

        let center = UNUserNotificationCenter.current()
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

        center.getPendingNotificationRequests { [reminderPrefix] requests in
            let pendingIdentifiers = requests
                .map { $0.identifier }
                .filter { $0.hasPrefix(reminderPrefix) }
            center.getDeliveredNotifications { notifications in
                let deliveredIdentifiers = notifications
                    .map { $0.request.identifier }
                    .filter { $0.hasPrefix(reminderPrefix) }
                center.removePendingNotificationRequests(withIdentifiers: pendingIdentifiers)
                center.removeDeliveredNotifications(withIdentifiers: deliveredIdentifiers)

                var scheduled = 0
                for reminder in reminders {
                    guard
                        let rawId = reminder["id"] as? String,
                        let title = reminder["title"] as? String,
                        let body = reminder["body"] as? String,
                        let atString = reminder["at"] as? String
                    else {
                        continue
                    }

                    let at = formatter.date(from: atString) ?? ISO8601DateFormatter().date(from: atString)
                    guard let at, at > Date() else { continue }

                    let content = UNMutableNotificationContent()
                    content.title = title
                    content.body = body
                    content.sound = .default
                    content.badge = 1
                    if #available(iOS 15.0, *) {
                        content.interruptionLevel = .active
                    }
                    content.userInfo = [
                        "cap_extra": reminder["extra"] as? JSObject ?? [:],
                        "cap_schedule": ["at": at]
                    ]

                    let interval = max(1, at.timeIntervalSinceNow)
                    let trigger = UNTimeIntervalNotificationTrigger(timeInterval: interval, repeats: false)
                    let request = UNNotificationRequest(identifier: "\(reminderPrefix)\(rawId)", content: content, trigger: trigger)
                    center.add(request)
                    scheduled += 1
                }

                call.resolve(["scheduled": scheduled])
            }
        }
    }
}
