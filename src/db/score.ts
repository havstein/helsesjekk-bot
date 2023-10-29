import * as R from 'remeda'

import { scoreAsked } from '../metrics/metrics'

import { prisma } from './prisma'

export async function getTeamScoreTimeline(teamId: string): Promise<
    | {
          timestamp: Date
          score: number
          answers: number
      }[]
    | { error: string }
> {
    const team = await prisma.team.findFirst({
        where: { active: true, id: teamId },
        include: {
            Asked: {
                where: { revealed: true, skipped: false },
                include: { answers: true },
            },
        },
    })

    if (team == null) {
        return {
            error: 'Fant ikke ditt team',
        }
    }

    if (team.Asked.length === 0) {
        return {
            error: 'Teamet ditt har ingen spørringer enda.',
        }
    }

    const scores = R.sortBy(
        team.Asked
            // This seems like a bug in the database, where an Asked is not "skipped", but has no answers
            .filter((asked) => asked.answers.length > 0)
            .map((asked) => {
                const scoredAsk = scoreAsked(asked)
                return {
                    timestamp: asked.timestamp,
                    score: scoredAsk.totalScore,
                    answers: scoredAsk.answerCount,
                }
            }),
        R.prop('timestamp'),
    )

    return scores
}

type WeekWithQuestionScores = {
    timestamp: Date
} & Record<number, { id: string; score: number | null }>

export async function getTeamScorePerQuestion(teamId: string): Promise<
    | {
          scoredQuestions: WeekWithQuestionScores[]
          questions: { id: string; question: string }[]
          maxQuestions: number
      }
    | { error: string }
> {
    const team = await prisma.team.findFirst({
        where: { active: true, id: teamId },
        include: {
            Asked: {
                where: { revealed: true, skipped: false },
                include: { answers: true },
            },
        },
    })

    if (team == null) {
        return {
            error: 'Fant ikke ditt team',
        }
    }

    if (team.Asked.length === 0) {
        return {
            error: 'Teamet ditt har ingen spørringer enda.',
        }
    }

    const scoredAsks = R.pipe(
        team.Asked,
        // This seems like a bug in the database, where an Asked is not "skipped", but has no answers
        R.filter((asked) => asked.answers.length > 0),
        R.map(scoreAsked),
    )

    const questionIndexLookup = R.pipe(
        scoredAsks,
        R.flatMap((it) => it.scoredQuestions),
        R.map((it) => it.id),
        R.uniqBy(R.identity),
        R.map.indexed((id, index): [string, number] => [id, index]),
        R.fromPairs.strict,
    )

    const maxIndex = R.pipe(
        questionIndexLookup,
        R.toPairs,
        R.maxBy((it) => it[1]),
        R.prop('1'),
    )

    const emptyQuestions = R.pipe(
        R.range(0, maxIndex + 1),
        R.map((index): [number, null] => [index, null]),
        R.fromPairs.strict,
    )

    const scores: WeekWithQuestionScores[] = R.sortBy(
        scoredAsks.map((scoredAsk) => {
            const scoredQuestionsByIndex = R.pipe(
                scoredAsk.scoredQuestions,
                R.map((it): [number, { id: string; score: number }] => [
                    questionIndexLookup[it.id],
                    { id: it.id, score: it.score },
                ]),
                R.fromPairs.strict,
            )
            return R.merge(emptyQuestions, {
                timestamp: scoredAsk.timestamp,
                ...scoredQuestionsByIndex,
            }) satisfies WeekWithQuestionScores
        }),
        R.prop('timestamp'),
    )

    const questions = R.pipe(
        scoredAsks,
        R.flatMap((it) => it.scoredQuestions),
        R.uniqBy(R.prop('id')),
        R.map((it) => ({ id: it.id, question: it.question })),
    )

    return { scoredQuestions: scores, maxQuestions: maxIndex, questions }
}
