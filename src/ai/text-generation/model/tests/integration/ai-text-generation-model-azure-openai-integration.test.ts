// libs
import { describe, expect, test } from 'vitest';

// test function
import {
  isTooLarge,
  textGenerationWithOpenAI,
} from '../../ai-text-generation-model-azure-openai.js';

//test variables
const testQuery =
  'Who is the father of theoretical computer science and artificial intelligence?\njust answer with the name of the person and nothing else';
const testResponse = 'Alan Turing';
const largeText =
  'According to Tech Jury, despite a number of cool apps and tips for successful time management, only 17% of people track their time. 50% of people have never thought about time waste, even though they are always late and running out of time. Time management is a skill. It helps people handle their daily duties without burnout and severe exhaustion. The N.I.L.C. includes time management on the list of top ten demanded soft skills that employees require in 2022. Why is it so important to manage one’s time correctly? Stephen Covey once said, “The key is not spending time, but in investing it”. It means that proper timing guarantees a person’s success in many life areas.\n\nCareer Trend names three negative aspects that occur when a person is not able to follow a schedule and be flexible. First off, one risks delaying the task performance all the time. People who got used to procrastination start doing assignments and duties at the very last moment. As a result, they sacrifice quality for the sake of deadlines. Moreover, procrastination is a perfect killer of vital energy and productiveness that are so essential in the XXI century. The second aspect is the development of a chronic late-coming habit. How can one come somewhere on time if a person cannot plan activities? Besides, late-coming and procrastination lead to the third negative aspect. It is a daily overload that results in burnout. When nothing is well-planned, people always get busy with something, go to bed late, and cannot relax. The pressure of undone tasks prevents them from normal sleep and rest. As a result, they acquire panic attacks, anxiety, sleep disorders, apathy, or depression.\n\nMindtools introduces five benefits that people face when managing their day successfully. To begin with, such people are known as productive and effective in what they do. Employers adore such individuals because they handle many tasks faster than other employees. Secondly, ideal time managers almost never feel stressed at work. They know what they have to do and how much time they require for that. Third, scheduling is the best promoter. For example, if a student has free time after having done academic homework, it will be possible to broaden one’s look. Such a student can read books to enlarge personal vocabulary, practice in report or article writing, visit different places, and meet new people for networking. All these things lead to the next benefit which is a positive reputation. Motivated individuals with perfect timing skills usually become a model for following. Finally, perfect time managers have more chances to succeed in life than time wasters. Those who control their time can control and supervise others.\n\nWhat can a person do to learn proper scheduling? Professionals give seven tips that can help everyone get more control over time. The first one is to set goals. Motivation is an ignition key. Moreover, the goal is to be achievable. If a person is bad at Geometry and the creation of new things, it is better not to dream about becoming a top designer. The next task is to learn prioritizing concepts. People often do tasks that can be done later but delay duties that should be done here and right now. Moreover, they often neglect tasks that are long-perspective. For example, a person needs to master a second language to get the desired occupation. She does other tasks but forgets to memorize new words and practice daily. As a result, she will not get the job because language mastering demands more than one day. The next recommendation is to set time frames for each task and try not to change them. When a person sees the approaching deadline, he speeds up a bit and stops delaying duties. Another essential thing is to have rest. Brains and human bodies, in general, cannot function well when being exhausted. Everybody knows that 20 minutes of noon sleep restores vital energy that helps to handle tasks in the second half of the day. Except for bedtime, one needs to enjoy a hobby or a pleasant activity.\n\nThe best method to stay on alert is to have a notebook or install an app such as Todoist, TimeTree, etc. A benefit of a notebook is that a person deals only with scheduling and jotting down without being distracted by messages and notifications. The benefits of apps are their notification systems and compact seizes of compatible devices. Besides, one never forgets a smartphone at home. By the way, 33% of individuals worldwide use Todoist to handle their daily duties. It is also possible to use the wall, online or mobile calendars. One can mark important meetings and tasks there. A system will send reminders, and a person will not forget about the upcoming event. Finally, one should plan everything in advance. It is a bad idea to start a day with a mess in one’s head. Psychologists recommend scheduling in the evening to have a set-up mind in the morning.\n\nAn extra tip for beginners might be sharing duties and avoiding extra work. For example, a person must make a team project. All members should take equal responsibilities to guarantee their on-time performance. If a friend asks an exhausted student to help, it will be better to excuse and refuse extra tasks. Otherwise, a friend will succeed while a student will fail.\n\nThe above-mentioned facts and tips highlight the importance of good time management. When people are not constantly in a hurry, they cope with many tasks and feel self-confident. They are not afraid of the coming day that brings more responsibilities and duties. Such people know how to turn a minute into a successful life investment. Perfect time managers are not lazy. They are productive and full of energy. Leading organizations and companies desire to get such individuals in their teams to boost overall productivity. Proper scheduling lets people be perfect leaders, team builders, assistants, and performers. As William Shakespear once said, “Better to be three hours to noon, than a minute too late"';

describe('invoked azure openAI GPT for text generation', async () => {
  test('call model with a query geanerates answer', async () => {
    const response = await textGenerationWithOpenAI({ userMessage: testQuery });
    expect(response).toBeDefined();
    expect(response).toStrictEqual(testResponse);
  });
});

describe('isTooLarge', async () => {
  test('returned false for small text', async () => {
    const result = isTooLarge({ text: 'mini text' });
    expect(result).toBeDefined();
    expect(result).toBe(false);
  });

  test('returned true for large text', async () => {
    const result = isTooLarge({ text: largeText.repeat(16) });
    expect(result).toBeDefined();
    expect(result).toBe(true);
  });
});
