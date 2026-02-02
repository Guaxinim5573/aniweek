import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ANILIST_APP_ID } from '../../constants';
import { AnilistService, AnimeMedia } from '../../services/anilist.service';
import { toObservable, toSignal } from "@angular/core/rxjs-interop"
import { filter, map, switchMap } from 'rxjs';
import { NgClass } from "@angular/common"
import { NgIcon } from '@ng-icons/core';
import { RouterLink } from "@angular/router";

@Component({
  selector: 'app-index.page',
  imports: [NgClass, NgIcon, RouterLink],
  templateUrl: './index.page.html',
  styleUrl: './index.page.css',
})
export class IndexPage {
  readonly anilist = inject(AnilistService)
  readonly authorizationUrl = `https://anilist.co/api/v2/oauth/authorize?client_id=${ANILIST_APP_ID}&response_type=token`

  readonly authorized = this.anilist.authorized
  readonly watchingList = toSignal(
    toObservable(this.anilist.userProfile).pipe(
      filter((profile) => !!profile),
      switchMap((profile) => this.anilist.getWatchingList()),
      map((entries) => entries
        .filter((entry) => entry.media.nextAiringEpisode && (entry.media.nextAiringEpisode.airingAt * 1000) < Date.now() + (7 * 86400000))
        .map((entry) => ({
          ...entry.media,
          day: new Date(entry.media.nextAiringEpisode.airingAt * 1000).getDay(),
          releaseTimeString: new Date(entry.media.nextAiringEpisode.airingAt * 1000)
        }))
        .reduce((acc, cur) => {
          if(acc[cur.day]) {
            acc[cur.day].push(cur)
            acc[cur.day] = acc[cur.day].sort((a, b) => a.nextAiringEpisode.airingAt - b.nextAiringEpisode.airingAt)
          } else {
            acc[cur.day] = [cur]
          }
          return {...acc}
        }, {} as Record<number, AnimeMedia[]>)
      )
    ), { initialValue: null }
  )

  readonly today = new Date().getDay()
  readonly days = [0,1,2,3,4,5,6]
  readonly daysName = [
    "Sun",
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat"
  ]

  /**
   * For a given day (0-6) returns the next date
   */
  getDayDate(targetDay: number) {
   const today = new Date()
   const daysUntilNext = (targetDay - today.getDay() + 7) % 7
   const nextDate = new Date(today)
   nextDate.setDate(today.getDate() + daysUntilNext)
   return nextDate.toLocaleString("en-US", { dateStyle: "medium" }).split(",")[0]
  }

  getTimeString(timestamp: number) {
    timestamp = timestamp * 1000
    const date = new Date(timestamp)
    return date.toLocaleTimeString("pt-BR", { timeStyle: "short" })
  }
}
