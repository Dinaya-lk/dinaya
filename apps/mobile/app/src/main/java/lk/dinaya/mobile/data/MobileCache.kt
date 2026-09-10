package lk.dinaya.mobile.data

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONObject

/**
 * Lightweight offline cache for the native app. Stores the raw JSON of the last
 * successful bootstrap / overview / bookings / calendar responses and serves them
 * back (marked stale by callers) when the network is unreachable.
 *
 * Room-less by design: plain SharedPreferences strings, no new Gradle deps.
 */
interface CacheStore {
    fun get(key: String): String?
    fun put(key: String, rawJson: String)
    fun clear()
}

class SharedPrefsCacheStore(prefs: SharedPreferences) : CacheStore {
    private val appPrefs = prefs

    override fun get(key: String): String? = appPrefs.getString(key, null)

    override fun put(key: String, rawJson: String) {
        appPrefs.edit().putString(key, rawJson).apply()
    }

    override fun clear() {
        appPrefs.edit().clear().apply()
    }
}

class LayeredCacheStore(
    private val memory: CacheStore,
    private val disk: CacheStore,
) : CacheStore {
    override fun get(key: String): String? {
        val cached = memory.get(key)
        if (cached != null) return cached
        val diskValue = disk.get(key) ?: return null
        memory.put(key, diskValue)
        return diskValue
    }

    override fun put(key: String, rawJson: String) {
        memory.put(key, rawJson)
        disk.put(key, rawJson)
    }

    override fun clear() {
        memory.clear()
        disk.clear()
    }
}

class InMemoryCacheStore : CacheStore {
    private val entries = mutableMapOf<String, String>()

    override fun get(key: String): String? = entries[key]

    override fun put(key: String, rawJson: String) {
        entries[key] = rawJson
    }

    override fun clear() {
        entries.clear()
    }
}

class MobileCache(private val store: CacheStore) {

    fun saveBootstrap(raw: JSONObject) = store.put(KEY_BOOTSTRAP, raw.toString())

    fun loadBootstrap(): JSONObject? = store.get(KEY_BOOTSTRAP)?.toJsonOrNull()

    fun saveOverview(raw: JSONObject) = store.put(KEY_OVERVIEW, raw.toString())

    fun loadOverview(): JSONObject? = store.get(KEY_OVERVIEW)?.toJsonOrNull()

    fun saveBookings(tab: String, raw: JSONObject) = store.put(bookingsKey(tab), raw.toString())

    fun loadBookings(tab: String): JSONObject? = store.get(bookingsKey(tab))?.toJsonOrNull()

    fun saveCalendar(view: String, date: String?, staffId: String?, raw: JSONObject) =
        store.put(calendarKey(view, date, staffId), raw.toString())

    fun loadCalendar(view: String, date: String?, staffId: String?): JSONObject? =
        store.get(calendarKey(view, date, staffId))?.toJsonOrNull()

    fun saveModule(module: String, raw: JSONObject) = store.put(moduleKey(module), raw.toString())

    fun loadModule(module: String): JSONObject? = store.get(moduleKey(module))?.toJsonOrNull()

    fun clear() = store.clear()

    companion object {
        const val KEY_BOOTSTRAP = "cache_bootstrap"
        const val KEY_OVERVIEW = "cache_overview"

        fun bookingsKey(tab: String): String = "cache_bookings_$tab"

        fun calendarKey(view: String, date: String?, staffId: String?): String =
            "cache_calendar_${view}_${date.orEmpty()}_${staffId.orEmpty()}"

        fun moduleKey(module: String): String = "cache_module_$module"

        fun fromContext(context: Context): MobileCache {
            val prefs = context.applicationContext
                .getSharedPreferences("dinaya_mobile_cache", Context.MODE_PRIVATE)
            return MobileCache(LayeredCacheStore(InMemoryCacheStore(), SharedPrefsCacheStore(prefs)))
        }
    }
}

private fun String.toJsonOrNull(): JSONObject? = runCatching { JSONObject(this) }.getOrNull()
