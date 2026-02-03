import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { defer, from, map, Observable, of, switchMap, tap, throwError } from 'rxjs';

export interface UserProfile {
  avatar: {
    large: string
    medium: string
  }
  id: number
  name: string
  siteUrl: string
  bannerImage: string | null
}

export interface EntryDate {
  year: number | null
  month: number | null
  day: number | null
}

export interface AnimeMedia {
  id: number
  idMal: number
  title: {
    romaji: string
    english: string
    native: string
    userPreferred: string
  }
  episodes: number | null
  siteUrl: string
  startDate: EntryDate
  endDate: EntryDate
  coverImage: {
    large: string
    medium: string
    small: string
    color: string
  }
  nextAiringEpisode: {
    timeUntilAiring: number
    airingAt: number
    episode: number
  }
}

export interface AnimeListEntry {
  id: number
  media: AnimeMedia
  status: string
  progress: number
  repeat: number
  private: boolean
  hiddenFromStatusLists: boolean
  startedAt: EntryDate
  completedAt: EntryDate
  updatedAt: number
  createdAt: number
}

export interface AnimeList {
  name: string
  status: string
  entries: AnimeListEntry[]
}

@Injectable({
  providedIn: 'root',
})
export class AnilistService {
  private readonly http = inject(HttpClient)
  readonly userProfile = signal<UserProfile | null | undefined>(undefined)
  readonly authorized = signal(false)
  readonly token = signal<string | null>(null)

  constructor() {
    const expires = localStorage.getItem("aniweek_anilistTokenExpiresAt")
    const token = localStorage.getItem("aniweek_anilistToken")
    if(expires && new Date(expires).getTime() > Date.now() && token) {
      this.token.set(token)
      this.authorized.set(true)
      from(this.getAuthorizedUser()).subscribe({
        next: (profile) => {
          this.userProfile.set(profile.data.Viewer)
        },
        error: (err) => {
          this.authorized.set(false)
          this.userProfile.set(null)
        }
      })
    } else {
      this.authorized.set(false)
      this.userProfile.set(null)
    }
  }

  private request<T>(query: string, variables: Record<string, unknown>) {
    const token = this.token()
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json"
    }
    if(token) headers["Authorization"] = `Bearer ${token}`
    return this.http.post<T>("https://graphql.anilist.co/", JSON.stringify({
      query, variables
    }), { headers })
  }

  authorize(token: string, expiresIn: number) {
    this.token.set(token)
    return this.getAuthorizedUser().pipe(
      tap({
        next: (profile) => {
          this.authorized.set(true)
          this.userProfile.set(profile.data.Viewer)
          localStorage.setItem("aniweek_anilistToken", token)
          localStorage.setItem("aniweek_anilistTokenExpiresAt", new Date(Date.now() + (expiresIn * 1000)).toISOString())
        },
        error: (err) => {
          this.authorized.set(false)
          this.userProfile.set(null)
        }
      })
    )
  }

  getAuthorizedUser() {
    return this.request<{
      data: {
        Viewer: UserProfile
      }
    }>(`
      query {
        Viewer {
          id
          name
          siteUrl
          bannerImage
          avatar { large medium }
        }
      }
    `, {})
  }

  getLists(id: number | string) {
    const [queryParams, mediaParams] = typeof id === "number"
      ? [
        "($id: Int, $type: MediaType)",
        "(userId: $id, type: $type)"
      ]
      : [
        "($name: String, $type: MediaType)",
        "(userName: $name, type: $type)"
      ]
    return defer(() => {
      return this.request<{
        data: {
          MediaListCollection: {
            lists: AnimeList[]
          }
        }
      }>(`
        query ${queryParams} {
          MediaListCollection${mediaParams} {
            lists {
              name
              status
              entries {
                id
                media {
                  id
                  idMal
                  title {
                    romaji
                    english
                    native
                    userPreferred
                  }
                  episodes
                  siteUrl
                  startDate {
                    year
                    month
                    day
                  }
                  endDate {
                    year
                    month
                    day
                  }
                  coverImage { large:extraLarge medium:large small:medium color }
                  nextAiringEpisode { timeUntilAiring airingAt episode }
                }
                status
                progress
                repeat
                private
                hiddenFromStatusLists
                startedAt {
                  year
                  month
                  day
                }
                completedAt {
                  year
                  month
                  day
                }
                updatedAt
                createdAt
              }
            }
          }
        }
      `, {
        [typeof id === "number" ? "id" : "name"]: id,
        type: "ANIME"
      })
    })
  }

  getUserProfile(id: number | string) {
    const [queryParams, userParams] = typeof id === "number"
      ? [
        "($id: Int)",
        "(id: $id)"
      ]
      : [
        "($name: String)",
        "(name: $name)"
      ]
    return this.request<{
      data: {
        User: UserProfile
      }
    }>(`
      query ${queryParams} {
        User ${userParams} {
          id
          name
          siteUrl
          bannerImage
          avatar { large medium }
        }
      }
    `.trim(), { [typeof id === "number" ? "id" : "name"]: id }).pipe(
      map((response) => response.data.User)
    )
  }

  /**
   * Returns only the anime entries on list CURRENT
   * @note Fails if there's no token
   * @param user User to get list. Self to get list of authorized user
   */
  getWatchingList(user: number | string | "self" = "self") {
    return defer(() => {
      const profile: Observable<UserProfile> = user === "self"
        ? defer(() => {
          const p = this.userProfile()
          if(p) return of(p)
          else return throwError(() => new Error("Couldn't get own profile"))
        })
        : this.getUserProfile(user)
      return profile.pipe(
        switchMap((profile) => this.getLists(profile.id)),
        map((response) => response.data.MediaListCollection.lists),
        map((lists) => {
          const currentList = lists.find((l) => l.status === "CURRENT")
          if(!currentList) throw new Error("Couldn't find CURRENT list")
          return currentList.entries
        })
      )
    })
  }
}