'use server'

import { logger } from '@navikt/next-logger'
import { revalidatePath } from 'next/cache'

import {
    setTeamName,
    setRevealTime,
    setAskTime,
    setTeamStatus,
    addQuestionToTeam,
    deleteQuestionFromTeam,
} from '../../db'
import { userHasAdGroup } from '../../auth/authentication'

export async function editTeamName(groupId: string, teamId: string, formData: FormData): Promise<void> {
    if (!(await userHasAdGroup(groupId))) {
        throw new Error('User does not have access to edit team name')
    }

    const name = formData.get('new_name').toString()

    logger.info(`User is editing team name, new name: ${name}`)

    await setTeamName(teamId, name)

    revalidatePath(`/team/${groupId}`)
}

export async function editTime(
    groupId: string,
    teamId: string,
    type: 'ask' | 'reveal',
    formData: FormData,
): Promise<void> {
    if (!(await userHasAdGroup(groupId))) {
        throw new Error('User does not have access to edit team name')
    }

    const hour = formData.get('hour').toString()
    const day = formData.get('day').toString()

    logger.info(`User is editing ${type}, new time: ${day} ${hour}`)

    if (type === 'ask') {
        await setAskTime(teamId, Number(hour), Number(day))
    } else {
        await setRevealTime(teamId, Number(hour), Number(day))
    }

    revalidatePath(`/team/${groupId}`)
}

export async function toggleTeamStatus(groupId: string, teamId: string, active: boolean): Promise<void> {
    if (!(await userHasAdGroup(groupId))) {
        throw new Error('User does not have access to edit team name')
    }

    await setTeamStatus(teamId, active)

    revalidatePath(`/team/${groupId}`)
}

export async function addQuestion(groupId: string, teamId: string, formData: FormData): Promise<void> {
    if (!(await userHasAdGroup(groupId))) {
        throw new Error('User does not have access to edit team name')
    }

    // TODO ZOD this
    const question = {
        question: formData.get('question').toString(),
        type: formData.get('type').toString(),
        high: formData.get('high').toString(),
        mid: formData.get('mid').toString(),
        low: formData.get('low').toString(),
    }

    logger.info(`User is adding question of type: ${question.type}`)

    await addQuestionToTeam(teamId, question)

    revalidatePath(`/team/${groupId}`)
}

export async function deleteQuestion(groupId: string, teamId: string, questionId: string): Promise<void> {
    if (!(await userHasAdGroup(groupId))) {
        throw new Error('User does not have access to edit team name')
    }

    await deleteQuestionFromTeam(teamId, questionId)

    revalidatePath(`/team/${groupId}`)
}
