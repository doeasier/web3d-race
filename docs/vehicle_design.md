��������������ɲ������ѧ����ĵ�

����

���ļ���֮ǰ�ڶԻ������۵���������������棺
1) �����������ϣ�AnimationMixer / AnimationAction��
2) ɲ��ģ�ͣ��̰�/������ֹͣ�������ƶ���ӳ�䣩

Ŀ��

- �� glTF ����ģ�͵Ķ��������������泵������״̬�������ٶȡ����š�ɲ����ת��ȡ�
- ʵ�ַ��ϸ�֪��ɲ���߼���֧�ֶ̰�����ɲ���볤������ɲ����������������Χ��ʵ��˼·�����ں�����������Ρ�

1. ���������������

������������
- VehicleController �����׼��״̬��{ speed (m/s), throttle (0..1), brakePressure (0..1), steer (-1..1), rpm }
- AnimationController����װ AnimationMixer����֡��ȡ��Щ���������� AnimationAction ��Ȩ�ء�timeScale ��ֱ�ӿ��ƹ����任�����緽���̡����֣���

�Ƽ���������
- idle����ֹ/���٣�
- drive_slow / drive_fast����һ�� locomotion clip��ͨ�� blend �л���
- brake����ģ�Ͱ�������/������ɲ������Ч��
- steer_subtle��������/����΢�㣩

ӳ����Ȩ�ز���ʾ��
- locomotionBlend = clamp(speed / speedForFullRun, 0, 1)��speedForFullRun ���� ~20 m/s��72 km/h����
- brakeWeight = brakePressure��0..1�������ڽ� brake �������벢���� locomotion ����Ȩ�ء�
- engineRev �� rpm �����Ǳ�򷢶����������ʣ� action.timeScale = rpm / nominalRpm��
- steer ���������̹����ͳ�����΢ roll/offset��������ƣ���

��̥�뷽����
- ��̥��ת�����������������ٶ� �� = v / r��r���ְ뾶����ÿ֡���¾ֲ���ת��
- ������ֱ�Ӹ��� steer �������ù����� transform ����ת��

ʵ��Ҫ��
- Ϊÿ�� clip ���� AnimationAction����֡ƽ������ action.weight������ͻ�䣩��
- ʹ�� cross-fade ���ֵ������Ȩ���л���
- �������ȼ���brake > steer > locomotion����ͨ��Ȩ�����Ƶ����ȼ���������
- ɲ����/β���ò��� emissive ǿ�ȹ��� brakePressure����Ч�ɰ� rpm/״̬��ϣ���������

2. ɲ������ѧ��ƣ��̰�/������

Ŀ����˼·
- ֧�ֶ̰�����ɲ/��ɲ���볤���������Ӵ��ƶ�������ɲ�����������ó������� 0-100 km/h ���ƶ����֣�ֹͣ���� 35-45 m Ϊ�ο�����
- ʹ�ü��˶�ѧ��ϵ d = v^2/(2*a) ��������ֹͣ����ӳ��Ϊƽ�����ٶ� a��

�ؼ�������ο�ֵ
- g = 9.81 m/s^2
- �̣�Ħ��ϵ������·�棩�� 0.7�C1.0������ a_max ? ��*g��
- a_heavy ���鷶Χ �� 7.5�C9.5 m/s^2����Ӧ 100 km/h ͣ������Լ 36�C40 m��
- a_light ���鷶Χ �� 2.0�C4.0 m/s^2
- longPressThreshold ���� 300�C400 ms���ж��̰�/������
- rampUpTime�������� 0 �� 1.0 brakePressure������ 0.5�C1.0 s

��Ϊ���򣨽��飩
- �������� < threshold���̰� -> ˲ʱ�����ͷ��� brakePressure������ 0.2�C0.4�����ͷź����˥���򱣳����ͷš�
- ��ס >= threshold������ -> brakePressure ��ʱ�����ԣ������ߣ�RampUp �� 1.0����������ƶ��������ͷ�ʱƽ���½���
- �� brakePressure ת��Ϊʵ�ʼ��ٶ� a��a = brakePressure * a_max_effective������ a_max_effective = clamp(a_heavy, 0, ��*g)��Ҳ�ɲ��÷ֶ�ӳ�䣨��ɲ��/��ɲ������

ʵ��Ҫ��
- InputManager ��¼��������ʱ�������ʱ��������̰�/������ʶ�� brakePressure ֵ��
- VehicleController ʹ�� brakePressure ������������ speed �ı仯����������������Ӧ���ƶ����أ���
- AnimationController �� brakePressure ��������Ȩ��Դ������ɲ��������ɲ�����복��ǰ��Ч����

��չ�����
- ���߱����������̥ץ��ģ�ͣ�Pacejka������ ABS ģ�⣬�����Ӷ��������ӡ�
- ��δ��������ʵ�������棨Rapier����Ӧ���ƶ���ӳ��Ϊ����Ť�ػ���̥ģ�����룬������ֱ���޸��ٶȡ�

3. �ӿ�����������飩

VehicleController �����չ��{ speed, throttle, brakePressure, isBraking, rpm, steer }
InputManager �����չ��{ throttleRaw, brakeRaw, brakePressedDuration, brakeEvent(short|long) }
AnimationController �ӿڣ�updateFromVehicle(state) -> ���� AnimationMixer/Actions �� weight/timeScale ����������/�����̱任
�ɱ�¶�� UI �ĵ����longPressThreshold, rampUpTime, a_light, a_heavy, ��, transitionDuration������ƽ����

4. �ο��������Դ�����ڵ��Σ�

- ͣ����������ٶȹ�ϵ��d = v^2/(2*a)
- Ħ��ϵ�� �̣��������ࣩ�� 0.7�C1.0��ʪ��/ѩ��Զ�͡�
- ����ֵ����ɲ�ɴﵽ 0.7�C1.0g����ɲԼ 0.2�C0.4g��

������������

- �����������ʵ�� AnimationController����װ mixer �붯����ϣ������� update ����������ѭ�������ü�ӳ�䣨speed->locomotion blend, brakePressure->brakeWeight����
- ʵ�� InputManager �Ķ̰�/������Ⲣ�� brakePressure ���� VehicleController�����õ��� UI �Ե��β��۲�ɲ��������֡�
- ����Ҫ���߱��棬������̥����/����ģ���� ABS ���ԡ�

�ĵ����棺���ļ���Ϊ������Ʋݰ������ں���ʵ������Ρ�